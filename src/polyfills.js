import { Buffer } from 'buffer';

window.global = window;
window.Buffer = Buffer;
window.process = { env: {} }; 