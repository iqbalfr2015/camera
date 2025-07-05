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

// Mapping user id ke socket id
const pesertaIdToSocket = {};
const staffIdToSocket = {};

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join ke room ujian tertentu
  socket.on("join-ujian-room", ({ ujian_id, peserta_id, staff }) => {
    console.log("join-ujian-room", { ujian_id, peserta_id, staff });
    socket.join(`ujian_${ujian_id}`);
    if (peserta_id) {
      socket.peserta_id = peserta_id;
      pesertaIdToSocket[peserta_id] = socket.id;
    }
    if (staff) {
      socket.isStaff = true;
      staffIdToSocket[socket.id] = socket.id; // pakai socket.id sebagai staff_id
    }
  });

  // Staff meminta peserta mengirim stream
  socket.on("request-peserta-stream", ({ peserta_id, staff_id, ujian_id }) => {
    console.log("request-peserta-stream", { peserta_id, staff_id, ujian_id });
    const pesertaSocketId = pesertaIdToSocket[peserta_id];
    if (pesertaSocketId) {
      io.to(pesertaSocketId).emit("staff-request-stream", { staff_id });
    }
  });

  // Peserta mengirim signal ke staff
  socket.on("peserta-signal", ({ to, from, signal, ujian_id }) => {
    console.log("peserta-signal", { to, from, ujian_id });
    if (to) {
      io.to(to).emit("peserta-signal", { from: socket.id, signal });
    }
  });

  // Staff mengirim signal balasan ke peserta
  socket.on("staff-signal", ({ to, from, signal, ujian_id }) => {
    console.log("staff-signal", { to, from, ujian_id });
    if (to) {
      io.to(to).emit("staff-signal", { from: socket.id, signal });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    if (socket.peserta_id) delete pesertaIdToSocket[socket.peserta_id];
    if (socket.isStaff) delete staffIdToSocket[socket.id];
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log("Signaling server running on port", PORT);
}); 