requirejs(['vis', 'GUIDGenerator', 'yjs'], function (vis, GUID) {
    Y({
        db: {
            name: 'memory' // store the shared data in memory
        },
        connector: {
            name: 'websockets-client', // use the websockets connector
            room: '123456'
            // url: 'localhost:2345'
        },
        share: { // specify the shared content
            nodes: 'Map',
            edges: 'Map'
        },
        sourceDir: 'http://mari0.github.io/example-yjs-requirejs-vis/bower_components'
    }).then(function (y) {
        console.log('Yjs is ready');
        window.y = y;


        for(var nodeKey in y.share.nodes.opContents){
            if(y.share.nodes.opContents.hasOwnProperty(nodeKey)){
                y.share.nodes.get(nodeKey).then(function (ymap) {
                    registerNodeObserver(ymap);
                    graph.nodes.add({ id: ymap.get('id'), label: ymap.get('label'), x: ymap.get('x'), y: ymap.get('y') });
                })
            }
        }

        for(var edgeKey in y.share.edges.opContents){
            if(y.share.edges.opContents.hasOwnProperty(edgeKey)){
                y.share.edges.get(edgeKey).then(function (ymap) {
                    registerEdgeObserver(ymap);
                    graph.edges.add(ymap.get('data'));
                })
            }
        }

        y.share.nodes.observe(function (events) {
            for (var i in events) {
                var event = events[i];
                var ymap = event.object;
                if (event.type === 'delete') {
                    graph.nodes.remove(event.name);
                }
                else if(event.type === 'add') {
                    ymap.get(event.name).then(function (ynode) {
                        graph.nodes.add({ id: event.name });
                        registerNodeObserver(ynode);
                    });
                }
            }
        });

        y.share.edges.observe(function (events) {
            for (var i in events) {
                var event = events[i];
                var ymap = event.object;
                if (event.type === 'delete') {
                    graph.edges.remove(event.name);
                } else if(event.type === 'add'){
                    ymap.get(event.name).then(function (yedge) {
                        registerEdgeObserver(yedge);
                    });
                }
            }
        });

        var registerNodeObserver = function (ymap) {
            ymap.observe(function (events) {
                for (var i in events) {
                    var event = events[i];
                    switch (event.name) {
                        case 'label': {
                            graph.nodes.update({ id: event.object.get('id'), label: event.object.get('label') });
                            break;
                        }
                        case 'x': {
                            graph.nodes.update({ id: event.object.get('id'), x: event.object.get('x') });
                            break;
                        }
                        case 'y': {
                            graph.nodes.update({ id: event.object.get('id'), y: event.object.get('y') });
                        }
                    }
                }
            })
        };

        var registerEdgeObserver = function (ymap) {
            ymap.observe(function (events) {
                for (var i in events) {
                    var event = events[i];
                    switch (event.name) {
                        case 'data': {
                            graph.edges.update(event.object.get('data'));
                            break;
                        }
                    }
                }
            })
        };

        draw();

    });


    var nodes = null;
    var edges = null;
    var network = null;
    // randomly create some nodes and edges
    //var graph = getScaleFreeNetwork(25);
    var graph = { nodes: new vis.DataSet(), edges: new vis.DataSet() };
    var seed = 2;


    function destroy() {
        if (network !== null) {
            network.destroy();
            network = null;
        }
    }

    function draw() {
        destroy();
        nodes = [];
        edges = [];

        // create a network
        var container = document.getElementById('mynetwork');
        var options = {
            layout: { randomSeed: seed }, // just to make sure the layout is the same when the locale is changed
            manipulation: {
                addNode: function (data, callback) {
                    // filling in the popup DOM elements
                    document.getElementById('operation').innerHTML = "Add Node";
                    document.getElementById('node-label').value = data.label;
                    document.getElementById('saveButton').onclick = saveData.bind(this, data, callback);
                    document.getElementById('cancelButton').onclick = clearPopUp.bind();
                    document.getElementById('network-popUp').style.display = 'block';
                },
                editNode: function (data, callback) {
                    // filling in the popup DOM elements
                    document.getElementById('operation').innerHTML = "Edit Node";
                    document.getElementById('node-label').value = data.label;
                    document.getElementById('saveButton').onclick = editData.bind(this, data, callback);
                    document.getElementById('cancelButton').onclick = cancelEdit.bind(this, callback);
                    document.getElementById('network-popUp').style.display = 'block';
                },
                editEdge: function (data, callback) {
                    y.share.edges.get(data.id).then(function (ymap) {
                        ymap.set('data', data);
                        callback(data);
                    });

                },
                addEdge: function (data, callback) {
                    data.id = GUID();
                    if (data.from == data.to) {
                        var r = confirm("Do you want to connect the node to itself?");
                        if (r == true) {
                            y.share.edges.set(data.id, Y.Map).then(function (ymap) {
                                ymap.set('data', data);
                            });
                            callback();
                        }
                    }
                    else {
                        y.share.edges.set(data.id, Y.Map).then(function (ymap) {
                            ymap.set('data', data);
                        });
                        callback();
                    }
                },
                deleteNode: function (data, callback) {
                    y.share.nodes.delete(data.nodes[0]);
                    for (var i = 0; i < data.edges; i++) {
                        y.share.edges.delete([data.edges[i]]);
                    }
                    callback();
                },
                deleteEdge: function (data, callback) {
                    y.share.edges.delete(data.edges[0]);
                    callback();
                }
            },
            physics:{
                enabled:false
            }
        };
        network = new vis.Network(container, graph, options);
        network.on('dragging', function (event) {
            if (event.nodes.length === 1) {
                y.share.nodes.get(event.nodes[0]).then(function (ymap) {
                    ymap.set('x', event.pointer.canvas.x);
                    ymap.set('y', event.pointer.canvas.y);
                });

            }
        });
    }

    function clearPopUp() {
        document.getElementById('saveButton').onclick = null;
        document.getElementById('cancelButton').onclick = null;
        document.getElementById('network-popUp').style.display = 'none';
    }

    function cancelEdit(callback) {
        clearPopUp();
        callback(null);
    }

    function saveData(data, callback) {
        data.label = document.getElementById('node-label').value;
        clearPopUp();
        y.share.nodes.set(data.id, Y.Map).then(function (ymap) {
            ymap.set('id', data.id);
            ymap.set('label', data.label);
            ymap.set('x', data.x);
            ymap.set('y', data.y);
        });
        callback();
    }

    function editData(data, callback) {
        data.label = document.getElementById('node-label').value;
        clearPopUp();
        y.share.nodes.get(data.id).then(function (ymap) {
            ymap.set('label', data.label);
        });
        callback();
    }
});