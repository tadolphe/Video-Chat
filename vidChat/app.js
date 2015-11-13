
/** REQUIREMENTS **/
var  webSocketServer = require('websocket').server,
     expr = require("express"),
     xpress = expr(),
     server = require('http').createServer(xpress),
     fs = require('fs');


/** GLOBAL VARIABLES **/
var port = process.env.PORT || 5000;

var clients = [];
var webrtc_discussions = {};
var waitingRoom = [];
var isCaller = true;
var currentToken = 0;

/** SET UP THE SEVER BASICS **/
// Configure express
xpress.configure(function() {
     xpress.use(expr.static(__dirname + "/public"));
     xpress.set("view options", {layout: false});
});
// Handle GET requests to root directory
xpress.get('/', function(req, res) {
    res.sendfile(__dirname + '/public/index.html');
});
// WebSocket Server
var wsServer = new webSocketServer({
    httpServer: server
});
// Set up the http server
server.listen(port, function(err) {
  if(!err) { console.log("Listening on port " + port); }
});

console.log("--------------");
console.log("Simple Server Started");
console.log(port);
console.log("--------------");


/** HOW THE SERVER HANDLE MESSAGES **/
wsServer.on("request", function(request) {

  var connection = request.accept(null, request.origin);
  clients.push(connection);
  connection.id = clients.length-1;
  connection.theirToken = currentToken;




  if (isCaller == true) {
    isCaller = false;
    connection.sendUTF(JSON.stringify({type:"assignment", role:"caller"}));
  } else if ( isCaller == false) {
    currentToken = currentToken+1;
    isCaller = true;
    connection.sendUTF(JSON.stringify({type:"assignment", role:"callee"}));
  }





  connection.on("message", function(message) {
    if (message.type === "utf8") {

      var parsedMessage = undefined;
      parsedMessage = JSON.parse(message.utf8Data); 
      console.log(parsedMessage);
      if (parsedMessage) {
        // option 1
        if (parsedMessage.type === "join") {
            if (webrtc_discussions[connection.theirToken] === undefined) {
              webrtc_discussions[connection.theirToken] = {};
            }
            webrtc_discussions[connection.theirToken][connection.id] = true;

        } 
        // option 2
        else { 
          Object.keys(webrtc_discussions[connection.theirToken]).forEach(function(id) {
            if (id != connection.id) {
              clients[id].send(message.utf8Data, log_error);
            }
          });
        }

      }// end if parsedMessage isn't undefined 
    }// end if message.type is utf8
  });
  
  connection.on("close", function(connection) {
    console.log("connection closed ("+connection.remoteAddress+")");    
    Object.keys(webrtc_discussions).forEach(function(token) {
      Object.keys(webrtc_discussions[token]).forEach(function(id) {
        if (id === connection.id) {
          delete webrtc_discussions[token][id];
        }
      });
    });
  });

  
});



// utility functions
function log_error(error) {
  if (error !== "Connection closed" && error !== undefined) {
    console.log("ERROR: "+error);
  }
}

