var canvas = document.querySelector("canvas");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var gl = canvas.getContext("webgl");

gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
gl.clearColor(0, .5, 1, 1);
gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

var vertex = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex, `
attribute vec3 a_position;
attribute vec3 a_color;

uniform mat4 u_perspective;
uniform mat4 u_matrix;

varying vec4 v_screenspace;
varying vec3 v_position;
varying vec3 v_color;

void main() {
  v_position = a_position;
  v_color = a_color;
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
varying vec3 v_color;

void main() {
  vec3 shade = v_position.yyy / 2.0;
  vec3 color = vec3(1.0, 1.0, v_color.r) * shade;
  gl_FragColor = vec4(color, 1.0);
}
`);
gl.compileShader(fragment);

var program = gl.createProgram();
gl.attachShader(program, vertex);
gl.attachShader(program, fragment);
gl.linkProgram(program);

gl.useProgram(program);

var scene = {
  terrain: {
    verts: [],
    index: [],
    color: [],
    buffers: {}
  }
}

var a_position = gl.getAttribLocation(program, "a_position");

var a_color = gl.getAttribLocation(program, "a_color");

var camera = {
  position: [0, 0, 0],
  target: [0, 0, 0],
  up: [0, 1, 0],
  perspective: mat4.create()
};

mat4.identity(camera.perspective);
mat4.perspective(camera.perspective, 45 * Math.PI / 180, canvas.width / canvas.height, .1, 300);
var u_perspective = gl.getUniformLocation(program, "u_perspective");

var u_matrix = gl.getUniformLocation(program, "u_matrix");

var render = function(time) {
  time *= 0.001;
  
  var distance = 10;
  
  camera.position = [
    Math.sin(time) * distance,
    5,
    Math.cos(time) * distance
  ];
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  var matrix = mat4.create();
  mat4.lookAt(matrix, camera.position, camera.target, camera.up);
  
  gl.enableVertexAttribArray(a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.position);
  gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
  
  gl.enableVertexAttribArray(a_color);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.color);
  gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 0, 0);
  
  gl.uniformMatrix4fv(u_perspective, false, camera.perspective);
  gl.uniformMatrix4fv(u_matrix, false, matrix);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene.terrain.buffers.index);
  
  gl.drawElements(gl.TRIANGLES, scene.terrain.index.length, gl.UNSIGNED_SHORT, 0);
  // gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
  
  requestAnimationFrame(render);
};

var noise = new Image();
noise.src = "noise.png";
noise.onload = function() {
  var heightmap = document.createElement("canvas");
  var context = heightmap.getContext("2d");
  heightmap.width = noise.width;
  heightmap.height = noise.height;
  context.drawImage(noise, 0, 0, noise.width, noise.height);
  var imageData = context.getImageData(0, 0, noise.width, noise.height);
  var getPixel = function(x, y) {
    x = Math.floor(x * (noise.width - 1));
    y = Math.floor(y * (noise.height - 1));
    var index = (y * noise.height + x) * 4;
    return imageData.data.slice(index, index + 4);
  }
  
  // create the plane
  // points along each axis
  var interval = 100;
  // size in scene units
  var size = 10;
  scene.terrain.verts = new Array(interval ** 2);
  scene.terrain.color = new Array(interval ** 2);
  // polys along each axis
  var edges = interval - 1;
  // element index buffer
  scene.terrain.index = new Array((edges ** 2) * 6);
  var { verts, index, color } = scene.terrain;
  
  //generate points, color attribute
  for (x = 0; x < interval; x++) {
    for (z = 0; z < interval; z++) {
      var i = ((x * interval + z) * 3);
      var u = x / (interval - 1);
      var v = z / (interval - 1);
      var pixel = getPixel(u, v);
      var height = pixel[0] / 255 * 2;
      color[i] = Math.random();
      color[i+1] = Math.random();
      color[i+2] = Math.random();
      verts[i] = x / (interval - 1) * size - (size / 2);
      verts[i+1] = height;
      verts[i+2] = z / (interval - 1) * size - (size / 2);
    }
  }
  
  //generate index list
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
  
  scene.terrain.buffers.position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  
  scene.terrain.buffers.color = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
  
  scene.terrain.buffers.index = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene.terrain.buffers.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
  
  requestAnimationFrame(render);
}