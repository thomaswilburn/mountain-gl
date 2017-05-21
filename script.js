var canvas = document.querySelector("canvas");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var gl = canvas.getContext("webgl");

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0, 0, 1, 1);
gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

var vertex = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex, `
attribute vec3 a_position;
uniform mat4 u_perspective;
uniform mat4 u_matrix;

void main() {
  gl_Position = u_perspective * u_matrix * vec4(a_position, 1.0);
}
`);
gl.compileShader(vertex);

var fragment = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment, `
precision mediump float;

void main() {
  gl_FragColor = vec4(1.0, 0.5, 0.0, 1.0);
}
`);
gl.compileShader(fragment);

var program = gl.createProgram();
gl.attachShader(program, vertex);
gl.attachShader(program, fragment);
gl.linkProgram(program);

gl.useProgram(program);

var triangles = [
  0.0, 1.0, 0.0,
  -1.0, -1.0, 0.0,
  1.0, -1.0, 0.0
];

var index = [0, 1, 2];

var a_position = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(program, a_position);

var positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangles), gl.STATIC_DRAW);

var indexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

var cameraCoords = [10, 10, -10];
var target = [0, 0, 0];
var up = [0, 1, 0];

var perspective = mat4.create();
mat4.identity(perspective);
mat4.perspective(perspective, 45 * Math.PI / 180, canvas.width / canvas.height, .1, 100);
var u_perspective = gl.getUniformLocation(program, "u_perspective");

var u_matrix = gl.getUniformLocation(program, "u_matrix");

var render = function(time) {
  time *= 0.001;
  
  cameraCoords = [
    Math.sin(time) * 10,
    10,
    Math.cos(time) * 10
  ]
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  var matrix = mat4.create();
  mat4.lookAt(matrix, cameraCoords, target, up);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
  
  gl.uniformMatrix4fv(u_perspective, false, perspective);
  gl.uniformMatrix4fv(u_matrix, false, matrix);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  
  gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
  // gl.drawArrays(gl.TRIANGLES, 0, triangles.length / 3);
  
  requestAnimationFrame(render);
};

requestAnimationFrame(render);

// var noise = new Image();
// noise.src = "noise.png";
// noise.onload = function() {
//   var heightmap = document.createElement("canvas");
//   var context = heightmap.getContext("2d");
//   heightmap.width = noise.width;
//   heightmap.height = noise.height;
//   context.drawImage(noise, 0, 0, noise.width, noise.height);
//   var imageData = context.getImageData(0, 0, noise.width, noise.height);
//   var getHeight = (x, y) => imageData.data[(x + y * noise.width) * 4];
  
//   //generate triangles
//   for (y = 0; y < 100; y++) {
//     for (x = 0; x < 100; x++) {
      
//     }
//   };
// }