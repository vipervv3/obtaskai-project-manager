const path = require('path'); 
const { exec } = require('child_process'); 
process.env.NODE_ENV = 'production'; 
require('./dist/index.js'); 
