// One generated midpoint followed by its real endpoint, on ordinary game RAFs.
// No timers, extra simulation ticks, GPU fences, readbacks, or unbounded queue.
export class FramePresenter {
  constructor() {
    this.interval=1000/60;this.realFrames=0;this.generatedFrames=0;this.presentations=0;
    this.dropped=0;this.suspensions=0;this.samples=new Float64Array(120);this.sampleCount=0;this.sampleIndex=0;
    this.reset();
  }
  reset() {this.pending=null;this.nextRenderAt=0;this.lastRealAt=0;this.slowSince=0;this.realInterval=0;this.sampleCount=0;this.sampleIndex=0;this.paused=false;}
  tick(now,enabled,key,minimumFPS=25,mode='responsive') {
    const dt=now-(this.lastTick??now);this.lastTick=now;
    if(dt>4&&dt<50)this.interval=this.interval*.9+dt*.1;
    if(key!==this.key||enabled!==this.enabled||mode!==this.mode||dt>200) {
      if(this.pending)this.dropped++;
      this.reset();this.key=key;this.enabled=enabled;this.mode=mode;
    }
    this.now=now;this.minimumFPS=minimumFPS;
    this.active=enabled&&!this.paused;
    if(!this.active)return 'render';
    if(this.pending)return mode==='smooth'?(this.pending.generatedPresented?'render':'present-generated'):'present-real';
    return now+.5<this.nextRenderAt?'hold':'render';
  }
  realRendered(now) {
    this.realFrames++;
    if(this.lastRealAt) {
      const dt=now-this.lastRealAt;
      this.realInterval=this.realInterval?this.realInterval*.9+dt*.1:dt;
      if(this.active&&this.realInterval>1000/this.minimumFPS*1.08) {
        this.slowSince||=now;
        if(now-this.slowSince>2000) {
          this.active=false;this.pending=null;this.paused=true;this.suspensions++;this.slowSince=0;
        }
      } else this.slowSince=0;
    }
    this.lastRealAt=now;
    this.nextRenderAt=now+this.interval*2;
  }
  generated(result,inputs,now) {
    this.realRendered(now);
    if(this.active&&result.valid) {
      this.pending={inputs:{...inputs,color:result.real},generated:result.generated,frameIndex:result.frameIndex,at:now,generatedPresented:false};
      return this.mode==='smooth'?{kind:'hold',color:result.real}:{kind:'generated',color:result.generated};
    }
    return {kind:'real',color:result.real};
  }
  takeReal(now) {
    const item=this.pending;
    if(!item)return null;
    if(this.mode==='smooth'&&!item.generatedPresented)return null;
    this.pending=null;
    if(now-item.at>Math.max(80,this.interval*3)) {this.dropped++;this.nextRenderAt=0;return null;}
    return item;
  }
  takeGenerated(now) {
    const item=this.pending;if(!item)return null;
    if(now-item.at>Math.max(80,this.interval*3)){this.pending=null;this.dropped++;this.nextRenderAt=0;return null;}
    item.generatedPresented=true;return {inputs:{...item.inputs,color:item.generated}};
  }
  presented(kind,now) {
    this.presentations++;if(kind==='generated')this.generatedFrames++;
    this.samples[this.sampleIndex]=now;this.sampleIndex=(this.sampleIndex+1)%this.samples.length;
    this.sampleCount=Math.min(this.samples.length,this.sampleCount+1);
  }
  report() {
    const first=this.samples[(this.sampleIndex-this.sampleCount+this.samples.length)%this.samples.length];
    const last=this.samples[(this.sampleIndex-1+this.samples.length)%this.samples.length];
    return {enabled:!!this.enabled,active:!!this.active,mode:this.mode,pending:this.pending?1:0,limit:1,
      realFrames:this.realFrames,generatedFrames:this.generatedFrames,presentations:this.presentations,
      realFPS:this.realInterval?1000/this.realInterval:null,
      submittedPresentationFPS:this.sampleCount>1?(this.sampleCount-1)*1000/(last-first):null,
      displayIntervalMs:this.interval,nominalAddedLatencyMs:this.active?this.interval*(this.mode==='smooth'?2:1):0,
      dropped:this.dropped,suspensions:this.suspensions,paused:this.paused,
      // Browser canvas submission is observable; physical scan-out is not.
      timing:'RAF canvas submissions; not measured monitor scan-out'};
  }
}
