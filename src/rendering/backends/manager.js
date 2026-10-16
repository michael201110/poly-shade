import { WebGPUBackend } from "./webgpu.js";

export class RenderBackends {
  constructor(sceneEffects) { this.logical=sceneEffects;this.active="Initializing WebGPU"; }
  render(scene,camera,settings) {
    if(this.failure||this.disposed)return;
    if(!this.gpu&&!this.initializing){
      this.gpu=new WebGPUBackend(this.logical.renderer.domElement,message=>this.fail(message));
      this.initializing=this.gpu.init().catch(error=>this.fail(error.message));
    }
    try {
      if(this.gpu?.render(scene,camera,settings,this.logical))this.active="WebGPU";
    } catch(error){this.fail(error.message);}
  }
  fail(message) {
    if(this.failure||this.disposed)return;
    this.failure=message;this.active="WebGPU unavailable";
    this.gpu?.temporal.invalidate("WebGPU failure");this.gpu?.hide();
    try{this.gpu?.dispose();}catch(error){this.cleanupFailure=error.message;}
    const notice=document.createElement('div');notice.id='polyshade-renderer-error';
    notice.textContent=`PolyShade requires WebGPU: ${message}. Press Home to disable PolyShade and return to the native game.`;
    Object.assign(notice.style,{position:'fixed',left:'10%',right:'10%',top:'40%',padding:'24px',background:'#17212f',color:'white',zIndex:'9999',fontFamily:'sans-serif'});
    document.body.append(notice);this.notice=notice;
    console.warn('[PolyShade] WebGPU unavailable; enhanced rendering stopped.',message);
  }
  report(){return {renderer:this.active,webgpuFailure:this.failure,cleanupFailure:this.cleanupFailure,webgpu:this.gpu?.report()};}
  dispose(){this.disposed=true;this.gpu?.dispose();this.notice?.remove();}
}
