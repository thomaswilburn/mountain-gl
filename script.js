var canvas = document.querySelector("canvas");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var gl = canvas.getContext("webgl");

gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
gl.clearColor(0, 0, 1, 1);
gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

var vertex = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex, `
attribute vec3 a_position;
uniform mat4 u_perspective;
uniform mat4 u_matrix;
varying vec4 v_screenspace;
varying vec3 v_position;

void main() {
  v_position = a_position;
  v_screenspace = u_perspective * u_matrix * vec4(a_position, 1.0);
  gl_Position = v_screenspace;
}
`);
gl.compileShader(vertex);

var fragment = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment, `
precision mediump float;

varying vec4 v_screenspace;
varying vec3 v_position;

void main() {
  gl_FragColor = vec4(v_position.yyy / 2.0, 1.0);
}
`);
gl.compileShader(fragment);

var program = gl.createProgram();
gl.attachShader(program, vertex);
gl.attachShader(program, fragment);
gl.linkProgram(program);

gl.useProgram(program);

var verts = [
  0.0, 1.0, 0.0,
  -1.0, -1.0, 0.0,
  1.0, -1.0, 0.0
];

var index = [0, 1, 2];

var a_position = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(program, a_position);

var positionBuffer = gl.createBuffer();
// gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
// gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

var indexBuffer = gl.createBuffer();
// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
// gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

var cameraCoords = [10, 3, -10];
var target = [0, 0, 0];
var up = [0, 1, 0];

var perspective = mat4.create();
mat4.identity(perspective);
mat4.perspective(perspective, 45 * Math.PI / 180, canvas.width / canvas.height, .1, 300);
var u_perspective = gl.getUniformLocation(program, "u_perspective");

var u_matrix = gl.getUniformLocation(program, "u_matrix");

var render = function(time) {
  time *= 0.001;
  
  var distance = 10;
  
  cameraCoords = [
    Math.sin(time) * distance,
    5,
    Math.cos(time) * distance
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
  // gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
  
  requestAnimationFrame(render);
};

// requestAnimationFrame(render);

var noise = new Image();
noise.src = "noise.png";
noise.onload = function() {
  var heightmap = document.createElement("canvas");
  var context = heightmap.getContext("2d");
  heightmap.width = noise.width;
  heightmap.height = noise.height;
  context.drawImage(noise, 0, 0, noise.width, noise.height);
  var imageData = context.getImageData(0, 0, noise.width, noise.height);
  var getHeight = function(x, y) {
    x = Math.floor(x * noise.width);
    y = Math.floor(y * noise.height);
    return imageData.data[(y * noise.height + x) * 4] / 255;
  }
  
  //create the plane
  var interval = 100;
  var size = 10;
  verts = new Array(interval ** 2);
  
  //generate points
  for (x = 0; x < interval; x++) {
    for (z = 0; z < interval; z++) {
      var i = ((x * interval + z) * 3);
      var height = getHeight(x / (interval - 1), z / (interval - 1)) * 2;
      verts[i] = x / (interval - 1) * size - (size / 2);
      verts[i+1] = height;
      verts[i+2] = z / (interval - 1) * size - (size / 2);
    }
  }
  
  //generate index list
  var edges = interval - 1;
  index = new Array((edges ** 2) * 6);
  for (var i = 0; i < edges; i++) {
    for (var j = 0; j < edges; j++) {
      var k = (i * edges + j) * 6;
      var corner = i * interval + j;
      index[k] = corner;
      index[k+1] = corner + 1;
      index[k+2] = corner + interval;
      index[k+3] = corner + 1;
      index[k+4] = corner + interval + 1;
      index[k+5] = corner + interval;
    }
  }
  
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
  
  requestAnimationFrame(render);
}