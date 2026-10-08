// Runs only in the PML verification harness. Readbacks never ship in the mod.
export async function verifyMotionGpu(page, shader) {
  return page.evaluate(fragment => {
    const c=window.__controller,t=c.three,r=c.cinematic.renderer;
    const width=512,height=64;
    const projection=new t.PerspectiveCamera(60,1,0.1,1000);
    const previousVP=projection.projectionMatrix.clone().multiply(new t.Matrix4().makeTranslation(1,0,0));
    const colors=new Float32Array(width*height*4),depths=new Float32Array(colors.length);
    const depthValue=z=>1000/(1000-0.1)-(1000*0.1)/((1000-0.1)*z);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const k=(y*width+x)*4,value=Math.floor(x/4)%2;
      colors.set([value,value,value,1],k);
      const depth=depthValue(1/(0.04+x*0.0003));depths.set([depth,depth,depth,1],k);
    }
    const color=new t.DataTexture(colors,width,height,t.RGBAFormat,t.FloatType);
    const depth=new t.DataTexture(depths,width,height,t.RGBAFormat,t.FloatType);
    for(const texture of [color,depth]){texture.needsUpdate=true;texture.minFilter=t.NearestFilter;texture.magFilter=t.NearestFilter;}
    const material=new t.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,blending:t.NoBlending,
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader:fragment+'void main(){gl_FragColor=vec4(cameraMotionBlur(vUv,texture2D(tInput,vUv).rgb),1.0);}',
      uniforms:{tInput:{value:color},tDepth:{value:depth},inverseProjection:{value:projection.projectionMatrixInverse},nearFar:{value:new t.Vector2(.1,1000)},cameraWorld:{value:new t.Matrix4()},previousViewProjection:{value:previousVP},motionTexel:{value:new t.Vector2(1/width,1/height)},objectMotionActive:{value:0},motionExposureScale:{value:1},motionVelocityRange:{value:new t.Vector2(1,1)},motionBlurStrength:{value:0},motionBlurMaxPixels:{value:64}}});
    const geometry=new t.PlaneGeometry(2,2),scene=new t.Scene(),camera=new t.OrthographicCamera(-1,1,1,-1,0,1);
    scene.add(new t.Mesh(geometry,material));
    const target=new t.WebGLRenderTarget(width,height,{type:t.UnsignedByteType,depthBuffer:false});
    const saved={target:r.getRenderTarget(),viewport:r.getViewport(new t.Vector4()),scissor:r.getScissorTest(),output:r.outputColorSpace,tone:r.toneMapping};
    const draw=strength=>{
      material.uniforms.motionBlurStrength.value=strength;r.setRenderTarget(target);
      r.__polyShadeNativeDraw.call(r,scene,camera);
      const pixels=new Uint8Array(colors.length);r.readRenderTargetPixels(target,0,0,width,height,pixels);return pixels;
    };
    try{
      r.setScissorTest(false);r.outputColorSpace=t.LinearSRGBColorSpace;r.toneMapping=t.NoToneMapping;
      const off=draw(0),on=draw(64/(1000/60));
      let offEnergy=0,onEnergy=0,changed=0,count=0;
      for(let y=4;y<height-4;y++)for(let x=80;x<width-80;x++){
        const k=(y*width+x)*4;count++;
        offEnergy+=(off[k]/255-.5)**2;onEnergy+=(on[k]/255-.5)**2;
        if(Math.abs(off[k]-on[k])>16)changed++;
      }
      // A nearer opaque surface must not bleed into background blur samples.
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const k=(y*width+x)*4,foreground=x>=width/2;
        colors.set(foreground?[1,0,0,1]:[1,1,1,1],k);
        const z=foreground?3:10,d=depthValue(z);depths.set([d,d,d,1],k);
      }
      color.needsUpdate=true;depth.needsUpdate=true;
      const edge=draw(64/(1000/60));let edgeLeak=0;
      for(let y=4;y<height-4;y++)for(let x=width/2-24;x<width/2-2;x++){
        const k=(y*width+x)*4;edgeLeak=Math.max(edgeLeak,Math.abs(edge[k]-edge[k+1]));
      }
      return {changedFraction:changed/count,contrastEnergyRatio:onEnergy/offEnergy,edgeLeak};
    }finally{
      r.setRenderTarget(saved.target);r.setViewport(saved.viewport);r.setScissorTest(saved.scissor);r.outputColorSpace=saved.output;r.toneMapping=saved.tone;
      material.dispose();geometry.dispose();target.dispose();color.dispose();depth.dispose();
    }
  }, shader.slice(0,shader.indexOf('void main(){')));
}
