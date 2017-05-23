var canvas = document.querySelector("canvas");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var gl = canvas.getContext("webgl");

gl.enable(gl.DEPTH_TEST);
// gl.enable(gl.CULL_FACE);
// gl.clearColor(1.0, .5, 0, 1);
gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

var vertex = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex, `
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec3 a_normal;

uniform mat4 u_perspective;
uniform mat4 u_matrix;

varying vec4 v_screenspace;
varying vec3 v_position;
varying vec3 v_color;
varying vec3 v_normal;

void main() {
  v_position = a_position;
  v_color = a_color;
  v_normal = a_normal;
  v_screenspace = u_perspective * u_matrix * vec4(a_position, 1.0);
  gl_Position = v_screenspace;
}
`);
gl.compileShader(vertex);

var fragment = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment, `
precision mediump float;

uniform vec3 u_light;

varying vec4 v_screenspace;
varying vec3 v_position;
varying vec3 v_color;
varying vec3 v_normal;

void main() {
  float shade = v_position.y / 4.0;
  float fog = 1.4 - v_screenspace.z * 0.05;
  vec3 normal = normalize(v_normal);
  vec3 light = normalize(u_light);
  float lighting = max(dot(normal, light), 0.0);
  vec3 color = v_color * shade * lighting * fog;
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
    normals: [],
    index: [],
    color: [],
    buffers: {
      position: gl.createBuffer(),
      index: gl.createBuffer(),
      color: gl.createBuffer(),
      normals: gl.createBuffer()
    }
  }
}

var a_position = gl.getAttribLocation(program, "a_position");
var a_color = gl.getAttribLocation(program, "a_color");
var a_normal = gl.getAttribLocation(program, "a_normal");

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
var u_light = gl.getUniformLocation(program, "u_light");

var render = function(time) {
  time *= 0.001;
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  var distance = 10;
  
  camera.position = [
    Math.sin(time * .2) * distance,
    Math.sin(time * .1) * 1 + 3,
    Math.cos(time * .2) * distance
  ];
  
  camera.target = [
    Math.sin(time) * 5,
    Math.abs(Math.cos(time * .3) * 2),
    Math.sin(time) * 5
  ]
  
  var light = [
    1,
    1,
    0
  ];
  
  
  gl.uniform3fv(u_light, light);
  
  var matrix = mat4.create();
  mat4.lookAt(matrix, camera.position, camera.target, camera.up);
  
  gl.enableVertexAttribArray(a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.position);
  gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
  
  gl.enableVertexAttribArray(a_color);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.color);
  gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, 0, 0);
  
  gl.enableVertexAttribArray(a_normal);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.normals);
  gl.vertexAttribPointer(a_normal, 3, gl.FLOAT, false, 0, 0);
  
  gl.uniformMatrix4fv(u_perspective, false, camera.perspective);
  gl.uniformMatrix4fv(u_matrix, false, matrix);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene.terrain.buffers.index);
  
  gl.drawElements(gl.TRIANGLES, scene.terrain.index.length, gl.UNSIGNED_SHORT, 0);
  // gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
  
  requestAnimationFrame(render);
};

var imageLoaded = function(e) {
  var image = e.target;
  var heightmap = document.createElement("canvas");
  var context = heightmap.getContext("2d");
  heightmap.width = image.width;
  heightmap.height = image.height;
  context.drawImage(image, 0, 0, image.width, image.height);
  var imageData = context.getImageData(0, 0, image.width, image.height);
  var getPixel = function(x, y) {
    if (x > 1 || x < 0 || y > 1 || y < 0) return [255, 255, 255, 0];
    x = Math.floor(x * (image.width - 1));
    y = Math.floor(y * (image.height - 1));
    var index = (y * image.height + x) * 4;
    return imageData.data.slice(index, index + 4);
  }
  
  // create the plane
  // points along each axis
  var interval = 100;
  // size in scene units
  var size = 16;
  scene.terrain.verts = new Array(interval ** 2 * 3);
  scene.terrain.color = new Array(interval ** 2 * 3);
  scene.terrain.normals = new Array(interval ** 2 * 3);
  // polys along each axis
  var edges = interval - 1;
  // element index buffer
  scene.terrain.index = new Array((edges ** 2) * 6);
  var { verts, index, color, normals } = scene.terrain;
  
  //generate points, color attribute
  for (x = 0; x < interval; x++) {
    for (z = 0; z < interval; z++) {
      var i = ((x * interval + z) * 3);
      var u = x / (interval - 1);
      var v = z / (interval - 1);
      var pixel = getPixel(u, v);
      //set the height at x/y
      var height = pixel[0] / 255 * 4;
      verts[i] = x / (interval - 1) * size - (size / 2);
      verts[i+1] = height;
      verts[i+2] = z / (interval - 1) * size - (size / 2);
      //approximate normal from neighboring pixels
      var offset = 1 / (interval - 1);
      var nL = getPixel(u - offset, v)[0] / 255;
      var nR = getPixel(u + offset, v)[0] / 255;
      var nU = getPixel(u, v - offset)[0] / 255;
      var nD = getPixel(u, v + offset)[0] / 255;
      var n = vec3.fromValues(nL - nR, .5, nD - nU);
      n = vec3.normalize(n, n);
      normals[i] = n[0];
      normals[i+1] = n[1];
      normals[i+2] = n[2];
      //generate colors
      color[i] = .5;
      color[i+1] = .5;//z % 2;
      color[i+2] = .5;
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
  
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
  
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.normals);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, scene.terrain.buffers.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);
  
  requestAnimationFrame(render);
}

var noise = new Image();
noise.src = "noise.png";
noise.onload = imageLoaded;