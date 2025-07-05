const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // izinkan semua origin (untuk dev/testing)
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000; // Railway akan set PORT

// Mapping socket.id ke peserta (jika perlu tracking manual)
const pesertaSockets = {};
const staffSockets = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-ujian-room", ({ ujian_id, peserta_id, staff }) => {
    socket.join(`ujian_${ujian_id}`);
    if (peserta_id && !staff) {
      // peserta_id sekarang adalah socket.id peserta
      pesertaSockets[socket.id] = ujian_id;
      console.log("PESERTA join room:", socket.id, "ujian:", ujian_id);
    }
    if (staff) {
      staffSockets[socket.id] = ujian_id;
      console.log("STAFF join room:", socket.id, "ujian:", ujian_id);
    }
  });

  socket.on("request-peserta-stream", ({ peserta_id, staff_id, ujian_id }) => {
    // peserta_id sekarang adalah socket.id peserta
    console.log("STAFF minta stream ke peserta socket.id:", peserta_id, "oleh staff:", staff_id);
    io.to(peserta_id).emit("staff-request-stream", { staff_id });
  });

  socket.on("peserta-signal", ({ to, from, signal, ujian_id }) => {
    // to = staff socket.id
    console.log("PESERTA kirim signal ke staff:", to, "dari:", from);
    io.to(to).emit("peserta-signal", { from, signal });
  });

  socket.on("staff-signal", ({ to, from, signal, ujian_id }) => {
    // to = peserta socket.id
    console.log("STAFF kirim signal ke peserta:", to, "dari:", from);
    io.to(to).emit("staff-signal", { from, signal });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    delete pesertaSockets[socket.id];
    delete staffSockets[socket.id];
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log("Signaling server running on port", PORT);
}); 