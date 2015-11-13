


var signaling_server; // signaling server for this call
var peer_connection; // peer connection object
var local_stream_added = false;
var iAmCaller = false;
var iAmCallee = false;

function start() {
    // create the WebRTC peer connection object
  peer_connection = new rtc_peer_connection({ 
    "iceServers": [ 
      { "url": "stun:"+stun_server }, 
    ]
  });
    // generic handler that sends any ice candidates to the other peer
  peer_connection.onicecandidate = function (ice_event) {
    if (ice_event.candidate) {
      signaling_server.send(
        JSON.stringify({
          type: "new_ice_candidate",
          candidate: ice_event.candidate,
        })
      );
    }
  };
    // display remote video streams when they arrive using local <video> MediaElement
  peer_connection.onaddstream = function (event) {
    connect_stream_to_src(event.stream, document.getElementById("remote_video"));
    // hide placeholder and show remote video
    document.getElementById("loading_state").style.display = "none";
    document.getElementById("open_call_state").style.display = "block";
  };

  // setup stream from the local camera 
  setup_video();

  
  var host = location.origin.replace(/^http/, 'ws');
  console.log(host);
  signaling_server = new WebSocket(host);
  
  signaling_server.onopen = function () {
      console.log("Web Socket Connection Established");      
    };
  signaling_server.onerror = function (error) {
        console.log("ERROR with the connection");
  };


  signaling_server.onmessage = function (serverMessage) {
    var parsedMessage = JSON.parse(serverMessage.data);
    console.log(parsedMessage.type);
    if(parsedMessage.type == 'assignment') {
      if( parsedMessage.role === "caller" ) {
        iAmCaller = true;
      }
      else if( parsedMessage.role === "callee" ) {
        iAmCallee = true;
      }
      setupCallerOrCallee();
    }
  }

} // end start()




function setupCallerOrCallee() {
  if (iAmCaller) { // you are the Caller
    console.log("Hey I was the caller.");
      // setup caller signal handler
      signaling_server.onmessage = caller_signal_handler;
      
      // tell the signaling server you have joined the call 
      signaling_server.send(
        JSON.stringify({ 
          type:"join"
        })
      );
      console.log("sent message");
    document.getElementById("loading_state").innerHTML = "Waiting on other party to connect at:<br/><br/>"+document.location;
  } 
    else if (iAmCallee) { // you have a hash fragment so you must be the Callee     
    console.log("Hey I was the calleee.");    
      // setup caller signal handler
      signaling_server.onmessage = callee_signal_handler;
      // tell the signaling server you have joined the call 
      signaling_server.send(
        JSON.stringify({ 
          type:"join"
        })
      );
      // let the caller know you have arrived so they can start the call
      signaling_server.send(
        JSON.stringify({ 
          type:"callee_arrived"
        })
      );
    document.getElementById("loading_state").innerHTML = "One moment please...connecting your call...";
  } // end else you are the callee

}





/* functions used above are defined below */

// handler to process new descriptions
function new_description_created(description) {
  peer_connection.setLocalDescription(
    description, 
    function () {
      signaling_server.send(
        JSON.stringify({
          type:"new_description",
          sdp:description 
        })
      );
    }, 
    log_error
  );
}

// handle signals as a caller
function caller_signal_handler(event) {
  var signal = JSON.parse(event.data);
  console.log(signal.type);
  if (signal.type === "callee_arrived") {
    create_offer();
  } else if (signal.type === "new_ice_candidate") {
    peer_connection.addIceCandidate(
      new rtc_ice_candidate(signal.candidate)
    );
  } else if (signal.type === "new_description") {
    peer_connection.setRemoteDescription(
      new rtc_session_description(signal.sdp), 
      function () {
        if (peer_connection.remoteDescription.type == "answer") {
          // Possible add custom call handling to make 
		  //the Survivor Buddy connection more secure
        }
      },
      log_error
    );
  } 
}

function create_offer() {
  if (local_stream_added) {
    console.log("creating offer");
    peer_connection.createOffer(
      new_description_created, 
      log_error
    );
  } else {
    console.log("local stream has not been added yet - delaying creating offer");
    setTimeout(function() {
      create_offer();
    }, 1000);
  }
}

// handle signals as a callee
function callee_signal_handler(event) {
  var signal = JSON.parse(event.data);
  if (signal.type === "new_ice_candidate") {
    peer_connection.addIceCandidate(
      new rtc_ice_candidate(signal.candidate)
    );
  } else if (signal.type === "new_description") {
    peer_connection.setRemoteDescription(
      new rtc_session_description(signal.sdp), 
      function () {
        if (peer_connection.remoteDescription.type == "offer") {
          create_answer();
        }
      },
      log_error
    );
  } else {
    // extend with your own signal types here
  }
}


function create_answer() {
  if (local_stream_added) {
    console.log("creating answer");
    peer_connection.createAnswer(new_description_created, log_error);
  } else {
    console.log("local stream has not been added yet - delaying creating answer");
    setTimeout(function() {
      create_answer();
    }, 1000);
  }
}

// setup stream from the local camera 
function setup_video() {
  console.log(navigator.webkitGetUserMedia);
  get_user_media(
    {  
      "audio": true,
      "video": true  // request access to local camera
    }, 
    function (local_stream) { // success callback
      console.log("1");
      // display preview from the local camera & microphone using local <video> MediaElement
      connect_stream_to_src(local_stream, document.getElementById("local_video"));
      console.log("2");
      // add local camera stream to peer_connection ready to be sent to the remote peer
      peer_connection.addStream(local_stream);
      console.log("3");
      local_stream_added = true;
      console.log("4");

    },
    log_error
  );
}

// generic error handler
function log_error(error) {
  console.log("Error: ");
  console.log(error);
}