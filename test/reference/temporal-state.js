// Historical GL reference used only by regression tests, never the mod bundle.
export {TemporalState} from '../../src/rendering/temporal-state.js';
import {UPSCALE_SCALES} from '../../src/rendering/temporal-state.js';
export function selectUpscaling(settings,caps,failed=false){
 const requested=settings.upscaling??'native',supported=!!(caps.webgl2&&caps.halfFloat&&caps.features?.depthTexture);
 const backend=requested==='reduced'?'reduced':supported&&!failed&&['auto','sgsr2-fragment'].includes(requested)?'sgsr2-fragment':'native';
 return {requested,backend,scale:backend==='native'?(requested==='native'?settings.renderScale??1:1):UPSCALE_SCALES[settings.upscaleQuality??'quality']??settings.upscaleCustomScale??.67,supported,compute:false,reason:null};
}
