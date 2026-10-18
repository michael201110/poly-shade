import fiPrepare from './generated/frameinterpolation_reconstruct_and_dilate_pass.wgsl.js';
import fiSetup from './generated/frameinterpolation_setup_pass.wgsl.js';
import fiPrevDepth from './generated/frameinterpolation_reconstruct_previous_depth_pass.wgsl.js';
import fiGame from './generated/frameinterpolation_game_motion_vector_field_pass.wgsl.js';
import fiGamePyramid from './generated/frameinterpolation_compute_game_vector_field_inpainting_pyramid_pass.wgsl.js';
import fiGameTail from './generated/frameinterpolation_compute_game_vector_field_inpainting_pyramid_pass_tail.wgsl.js';
import fiFlow from './generated/frameinterpolation_optical_flow_vector_field_pass.wgsl.js';
import fiDisocclusion from './generated/frameinterpolation_disocclusion_mask_pass.wgsl.js';
import fiInterpolate from './generated/frameinterpolation_pass.wgsl.js';
import fiColorPyramid from './generated/frameinterpolation_compute_inpainting_pyramid_pass.wgsl.js';
import fiColorTail from './generated/frameinterpolation_compute_inpainting_pyramid_pass_tail.wgsl.js';
import fiInpaint from './generated/frameinterpolation_inpainting_pass.wgsl.js';
import fiDebug from './generated/frameinterpolation_debug_view_pass.wgsl.js';
import ofPrepare from './generated/opticalflow_prepare_luma_pass.wgsl.js';
import ofPyramid from './generated/opticalflow_compute_luminance_pyramid_pass.wgsl.js';
import ofHistogram from './generated/opticalflow_generate_scd_histogram_pass.wgsl.js';
import ofDivergence from './generated/opticalflow_compute_scd_divergence_pass.wgsl.js';
import ofSearch from './generated/opticalflow_compute_optical_flow_advanced_pass_v5.wgsl.js';
import ofFilter from './generated/opticalflow_filter_optical_flow_pass_v5.wgsl.js';
import ofScale from './generated/opticalflow_scale_optical_flow_advanced_pass_v5.wgsl.js';
export const FG_SHADERS=Object.freeze({fiPrepare,fiSetup,fiPrevDepth,fiGame,fiGamePyramid,fiGameTail,
  fiFlow,fiDisocclusion,fiInterpolate,fiColorPyramid,fiColorTail,fiInpaint,fiDebug,
  ofPrepare,ofPyramid,ofHistogram,ofDivergence,ofSearch,ofFilter,ofScale});
