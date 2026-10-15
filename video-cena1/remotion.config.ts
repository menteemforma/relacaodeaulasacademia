import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// "angle" garante WebGL (cena 3D) no Mac e no Windows.
Config.setChromiumOpenGlRenderer('angle');
