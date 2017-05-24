var canvas = document.querySelector("canvas");
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;
var gl = canvas.getContext("webgl");

// depth-testing means we don't have to worry about rendering order, GL will track it for us.
gl.enable(gl.DEPTH_TEST);
// this removes (does not render) back-facing triangles
gl.enable(gl.CULL_FACE);
// gl.clearColor(1.0, .5, 0, 1);
gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

/*

GL rendering is done through a "program," consisting of two linked shaders.
Shaders are written in a C-like language, with a main() function for each, and
provide output by writing to global variables (like gl_Position or
gl_FragColor). The vertex shader converts inputs (typically in world-space)
into X/Y screen coordinates, and the fragment shader is then called to render
each pixel in the resulting polygon.

Shaders get input via two "types" of variable: uniforms, which are available
to both the fragment and the vertex shader and represent values that stay
constant across an entire rendering pass (like lighting or camera position),
and attributes, which are per-vertex values. Fragment shaders do not have
access to attributes, but they can receive data from the vertex shader via
varyings, which blend between the per-vertex values.

*/

var vertex = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex, `
// each vertex has a position, a color, and a normal vector for lighting
attribute vec3 a_position;
attribute vec3 a_color;
attribute vec3 a_normal;

// the vertex shader uses these uniforms to convert world coords into screen coords
uniform mat4 u_perspective;
uniform mat4 u_camera;
uniform mat4 u_position;

// pass-through varyings used to send values to the fragment shader
varying vec4 v_screenspace;
varying vec3 v_position;
varying vec3 v_color;
varying vec3 v_normal;

void main() {
  v_position = a_position;
  v_color = a_color;
  v_normal = normalize(a_normal);
  v_screenspace = u_perspective * u_camera * u_position * vec4(a_position, 1.0);
  gl_Position = v_screenspace;
}
`);
gl.compileShader(vertex);

var fragment = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment, `
precision highp float;

uniform vec3 u_light;
uniform vec3 u_light_color;
uniform float u_light_intensity;
uniform float u_time;

varying vec4 v_screenspace;
varying vec3 v_position;
varying vec3 v_color;
varying vec3 v_normal;

float noise(vec2 seed) {
  float result = fract(sin(dot(seed.xy ,vec2(12.9898,78.233))) * 43758.5453);
  return result;
}

void main() {
  float shade = v_position.y / 4.0;
  float fog = 1.4 - v_screenspace.z * 0.01;
  vec3 normal = normalize(v_normal);
  vec3 lightDirection = normalize(u_light);
  float facing = max(dot(normal, lightDirection), 0.0);
  vec3 diffuse = u_light_color * facing;
  vec3 color = v_color * shade * (noise(v_screenspace.xy) * 0.1 + 0.9);
  vec3 pixel = clamp(color + diffuse * u_light_intensity, 0.0, 1.0) * fog;
  gl_FragColor = vec4(pixel, 1.0);
}
`);
gl.compileShader(fragment);

// create the program and link it with the two shaders
var program = gl.createProgram();
gl.attachShader(program, vertex);
gl.attachShader(program, fragment);
gl.linkProgram(program);

gl.useProgram(program);

// Container variable to hold state related to the 3D scene
// GL largely works via global state, which is a pain
var scene = {
  terrain: {
    position: {
      x: 0,
      y: 0,
      z: 0,
      r: 0
    },
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
  },
}

program.attribs = {
  a_position: gl.getAttribLocation(program, "a_position"),
  a_color: gl.getAttribLocation(program, "a_color"),
  a_normal: gl.getAttribLocation(program, "a_normal")
}

var camera = {
  position: [10, 10, 10],
  target: [0, 0, 0],
  up: [0, 1, 0],
  perspective: mat4.create()
};

mat4.identity(camera.perspective);
mat4.perspective(camera.perspective, 45 * Math.PI / 180, canvas.width / canvas.height, .1, 300);

program.uniforms = {
  u_perspective: gl.getUniformLocation(program, "u_perspective"),
  u_camera: gl.getUniformLocation(program, "u_camera"),
  u_position: gl.getUniformLocation(program, "u_position"),
  u_light: gl.getUniformLocation(program, "u_light"),
  u_light_color: gl.getUniformLocation(program, "u_light_color"),
  u_light_intensity: gl.getUniformLocation(program, "u_light_intensity"),
  u_time: gl.getUniformLocation(program, "u_time")
};

var render = function(time) {
  time *= 0.001;
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  var distance = 10;
  
  camera.position = [
    Math.sin(time * .2) * distance,
    10,
    Math.cos(time * .2) * distance
  ];
  
  // camera.target = [
  //   Math.sin(time * .1) * 5,
  //   4,
  //   Math.sin(time * .1) * 5
  // ]
  
  var light = [1, .5, 0];
  var lightColor = [1, .5, 0];
  var intensity = Math.sin(time) * .2 + .2;
  
  gl.uniform3fv(program.uniforms.u_light, light);
  gl.uniform3fv(program.uniforms.u_light_color, lightColor);
  gl.uniform1f(program.uniforms.u_light_intensity, intensity);
  gl.uniform1f(program.uniforms.u_time, time);
  
  gl.enableVertexAttribArray(program.attribs.a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.position);
  gl.vertexAttribPointer(program.attribs.a_position, 3, gl.FLOAT, false, 0, 0);
  
  gl.enableVertexAttribArray(program.attribs.a_color);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.color);
  gl.vertexAttribPointer(program.attribs.a_color, 3, gl.FLOAT, false, 0, 0);
  
  gl.enableVertexAttribArray(program.attribs.a_normal);
  gl.bindBuffer(gl.ARRAY_BUFFER, scene.terrain.buffers.normals);
  gl.vertexAttribPointer(program.attribs.a_normal, 3, gl.FLOAT, false, 0, 0);
  
  var matrix = mat4.create();
  mat4.lookAt(matrix, camera.position, camera.target, camera.up);
  
  var translation = vec4.fromValues(scene.terrain.position.x, scene.terrain.position.y, scene.terrain.position.z, 1);
  var position = mat4.create();
  mat4.fromTranslation(position, translation);
  mat4.rotateY(position, position, scene.terrain.position.r, [0, 0, 0]);
  
  gl.uniformMatrix4fv(program.uniforms.u_position, false, position);
  gl.uniformMatrix4fv(program.uniforms.u_perspective, false, camera.perspective);
  gl.uniformMatrix4fv(program.uniforms.u_camera, false, matrix);
  
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
      // n = vec3.normalize(n, n);
      normals[i] = n[0];
      normals[i+1] = n[1];
      normals[i+2] = n[2];
      //generate colors
      color[i] = .5;
      color[i+1] = 1;//z % 2;
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