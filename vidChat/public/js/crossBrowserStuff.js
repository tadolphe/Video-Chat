
var webrtc_capable = true;
var rtc_peer_connection = null;
var rtc_session_description = null;
var rtc_ice_candidate = null;
var get_user_media = null;
var connect_stream_to_src = null;
var stun_server = "stun.l.google.com:19302";
if (navigator.getUserMedia) { // WebRTC 1.0 standard compliant browser
  rtc_peer_connection = RTCPeerConnection;
  rtc_session_description = RTCSessionDescription;
  rtc_ice_candidate = RTCIceCandidate;
  get_user_media = navigator.getUserMedia.bind(navigator);
  connect_stream_to_src = function(media_stream, media_element) {
    console.log("Regular connect stream to src?");
    // https://www.w3.org/Bugs/Public/show_bug.cgi?id=21606
    media_element.srcObject = media_stream;
    media_element.play();
  };

} else if (navigator.mozGetUserMedia) { // early firefox webrtc implementation
  rtc_peer_connection = mozRTCPeerConnection;
  rtc_session_description = mozRTCSessionDescription;
  rtc_ice_candidate = mozRTCIceCandidate;
  get_user_media = navigator.mozGetUserMedia.bind(navigator);
  connect_stream_to_src = function(media_stream, media_element) {
    console.log("Firefox connect stream to src.");
    media_element.mozSrcObject = media_stream;
    media_element.play();
  };
  stun_server = "23.21.150.121"; // Mozilla's STUN server
  
} else if (navigator.webkitGetUserMedia) { // early webkit webrtc implementation
  rtc_peer_connection = webkitRTCPeerConnection;
  rtc_session_description = RTCSessionDescription;
  rtc_ice_candidate = RTCIceCandidate;
  get_user_media = navigator.webkitGetUserMedia.bind(navigator);
  connect_stream_to_src = function(media_stream, media_element) {
    console.log("Chrome connect stream to src.");
    media_element.src = webkitURL.createObjectURL(media_stream);
    media_element.play();
  };
} else {
  alert("This browser does not support WebRTC - please install WebRTC");
  webrtc_capable = false;
}