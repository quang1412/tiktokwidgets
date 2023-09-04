const express = require("express");
const app = express();
const { Server } = require("socket.io");
const io = new Server(app);

app.use(express.static("public"));

app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

io.of("/app").on("connection", socket => {
  console.log("new client connected!", socket.id)
})