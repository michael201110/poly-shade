// Diagnostic prototype: consolidate small uniform uploads before each submit.
// Copies retain their original order and destinations, including overlaps.
export class UniformUploads {
  constructor(device) {
    this.device=device;this.queue=device.queue;this.active=false;
    this.arena=new Uint8Array(262144);this.words=new Uint32Array(this.arena.buffer);this.views=new WeakMap();this.buffers=[];this.ranges=new Uint32Array(4096);
    this.count=0;this.used=0;this.gpuSize=0;this.writes=0;this.batches=0;this.bytes=0;
    this.originalWrite=this.queue.writeBuffer;this.originalSubmit=this.queue.submit;
    const self=this;
    this.writeWrapper=function(buffer,offset,data,dataOffset=0,size){
      const unit=data.BYTES_PER_ELEMENT??1;
      const bytes=size===undefined?data.byteLength-dataOffset*unit:size*unit;
      if(!self.active || !(buffer.usage&GPUBufferUsage.UNIFORM) || bytes%4 || offset%4)
        return self.originalWrite.call(this,buffer,offset,data,dataOffset,size);
      self.capture(buffer,offset,data,dataOffset*unit,bytes);
    };
    this.submitWrapper=function(commands){
      if(self.active && self.count){const upload=self.flush();return self.originalSubmit.call(this,[upload,...commands]);}
      return self.originalSubmit.call(this,commands);
    };
    this.queue.writeBuffer=this.writeWrapper;this.queue.submit=this.submitWrapper;
  }
  begin(){this.active=true;}
  capture(buffer,offset,data,start,bytes){
    const length=this.used+bytes;
    if(length>this.arena.length){const next=new Uint8Array(Math.max(length,this.arena.length*2));next.set(this.arena);this.arena=next;this.words=new Uint32Array(next.buffer);}
    if((this.count+1)*3>this.ranges.length){const next=new Uint32Array(this.ranges.length*2);next.set(this.ranges);this.ranges=next;}
    const source=ArrayBuffer.isView(data)?data.buffer:data;start+=(data.byteOffset??0);
    let views=this.views.get(source);if(!views){views={bytes:new Uint8Array(source),words:source.byteLength%4===0?new Uint32Array(source):null};this.views.set(source,views);}
    if(views.words&&start%4===0){for(let i=0;i<bytes/4;i++)this.words[this.used/4+i]=views.words[start/4+i];}
    else for(let i=0;i<bytes;i++)this.arena[this.used+i]=views.bytes[start+i];
    this.buffers[this.count]=buffer;const at=this.count*3;this.ranges[at]=offset;this.ranges[at+1]=this.used;this.ranges[at+2]=bytes;
    this.used=length;this.count++;this.writes++;this.bytes+=bytes;
  }
  flush(){
    if(this.used>this.gpuSize){this.staging?.destroy();this.gpuSize=Math.max(this.used,262144);this.staging=this.device.createBuffer({label:'PolyShade consolidated uniforms',size:this.gpuSize,usage:GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST});}
    this.originalWrite.call(this.queue,this.staging,0,this.arena,0,this.used);
    const encoder=this.device.createCommandEncoder({label:'PolyShade uniform copies'});
    for(let i=0;i<this.count;i++){const at=i*3;encoder.copyBufferToBuffer(this.staging,this.ranges[at+1],this.buffers[i],this.ranges[at],this.ranges[at+2]);}
    this.count=0;this.used=0;this.batches++;return encoder.finish();
  }
  end(){if(this.count)this.originalSubmit.call(this.queue,[this.flush()]);this.active=false;}
  dispose(){if(this.queue.writeBuffer===this.writeWrapper)this.queue.writeBuffer=this.originalWrite;if(this.queue.submit===this.submitWrapper)this.queue.submit=this.originalSubmit;this.staging?.destroy();}
}
