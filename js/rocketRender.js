
    var scene, camera, renderer;
    var geometry, material, mesh;

    init();
    animate();

    function init() {

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.z = 1000;

        geometry = new THREE.BoxGeometry( 200, 200, 200 );
        material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

        var loader = new THREE.STLLoader();
				loader.load( './resources/rocket.stl', function ( geometry ) {
					var material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111 } );
					var mesh = new THREE.Mesh( geometry, material );
					mesh.position.set( 0, 0, 0);
					mesh.scale.set( 0.5, 0.5, 0.5 );
					scene.add( mesh );
				} );

        renderer = new THREE.WebGLRenderer();
        renderer.setSize( window.innerWidth, window.innerHeight );

        document.body.appendChild( renderer.domElement );

    }

    function animate() {

        requestAnimationFrame( animate );

        mesh.rotation.x += 0.01;
        mesh.rotation.y += 0.02;

        renderer.render( scene, camera );

    }
