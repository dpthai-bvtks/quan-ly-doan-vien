import expressApp from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import crypto from 'crypto';

const app = expressApp();

// Middleware thiết lập các tiêu đề bảo mật để tránh clickjacking, sniff MIME, rò rỉ referrer và tấn công XSS/CSP
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' *; img-src 'self' data: https:; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  next();
});

app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Lưu trữ trạng thái các phòng chơi
const rooms = {};

// Helper: Generate secure random 4-digit PIN
const generatePIN = () => crypto.randomInt(1000, 10000).toString();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- HOST EVENTS ---

  socket.on('host_create_room', () => {
    const pin = generatePIN();
    const hostToken = crypto.randomBytes(8).toString('hex');
    rooms[pin] = {
      hostId: socket.id,
      hostToken: hostToken,
      players: [],
      gameState: 'lobby', // lobby, question, revealed, leaderboard
      currentQuestionIndex: -1,
      correctAnswer: null,
      hostDisconnected: false
    };
    socket.join(pin);
    socket.emit('room_created', { pin, hostToken });
    console.log(`Room ${pin} created by ${socket.id} with token ${hostToken}`);
  });

  socket.on('host_reclaim_room', ({ pin, hostToken }) => {
    const room = rooms[pin];
    if (room && room.hostToken === hostToken) {
      if (room.hostDisconnectTimer) {
        clearTimeout(room.hostDisconnectTimer);
        room.hostDisconnectTimer = null;
      }
      room.hostDisconnected = false;
      room.hostId = socket.id;
      socket.join(pin);
      socket.emit('room_reclaimed', {
        pin,
        gameState: room.gameState,
        currentQuestionIndex: room.currentQuestionIndex,
        players: room.players
      });
      // Send host current players list
      socket.emit('players_update', room.players);
      console.log(`Room ${pin} reclaimed by host ${socket.id}`);
    } else {
      socket.emit('reclaim_failed', 'Phòng không tồn tại hoặc token không hợp lệ.');
    }
  });

  socket.on('host_start_game', (pin) => {
    if (rooms[pin] && rooms[pin].hostId === socket.id) {
      rooms[pin].gameState = 'playing';
      io.to(pin).emit('game_started');
    }
  });

  socket.on('host_show_question', ({ pin, questionIndex, correctAnswer, questionData }) => {
    if (rooms[pin] && rooms[pin].hostId === socket.id) {
      rooms[pin].gameState = 'question';
      rooms[pin].currentQuestionIndex = questionIndex;
      rooms[pin].correctAnswer = correctAnswer;
      rooms[pin].explanation = questionData.explanation; // LƯU GIẢI THÍCH
      rooms[pin].questionData = questionData; // LƯU DỮ LIỆU CÂU HỎI CHI TIẾT
      
      // Reset currentAnswer cho tất cả player
      rooms[pin].players.forEach(p => p.currentAnswer = null);
      
      io.to(pin).emit('new_question', { questionIndex, questionData });
      io.to(rooms[pin].hostId).emit('players_update', rooms[pin].players); // update host
    }
  });

  socket.on('host_reveal_answer', (pin) => {
    if (rooms[pin] && rooms[pin].hostId === socket.id) {
      rooms[pin].gameState = 'revealed';
      const correctOpt = rooms[pin].correctAnswer;

      // Tính điểm
      rooms[pin].players.forEach(p => {
        if (p.alive) {
          if (p.currentAnswer === correctOpt) {
            p.score += 1;
          } else {
            p.alive = false; // Loại!
          }
        }
      });

      // Gửi kết quả cho từng người chơi
      rooms[pin].players.forEach(p => {
        const isCorrect = p.currentAnswer === correctOpt;
        io.to(p.socketId).emit('question_result', {
          isCorrect,
          isAlive: p.alive,
          correctAnswer: correctOpt,
          explanation: rooms[pin].explanation
        });
      });

      // Cập nhật cho Host
      io.to(rooms[pin].hostId).emit('players_update', rooms[pin].players);
    }
  });

  socket.on('host_end_game', (pin) => {
    if (rooms[pin] && rooms[pin].hostId === socket.id) {
      rooms[pin].gameState = 'leaderboard';
      io.to(pin).emit('game_ended', rooms[pin].players);
    }
  });

  // --- PLAYER EVENTS ---

  socket.on('player_join', ({ pin, name }) => {
    const room = rooms[pin];
    if (room && (room.gameState === 'lobby' || room.gameState === 'playing' || room.gameState === 'question' || room.gameState === 'revealed')) {
      let player = room.players.find(p => p.name === name);
      if (player) {
        // Reconnect
        player.socketId = socket.id;
        player.disconnected = false; // Trực tuyến lại
        console.log(`Player ${name} reconnected in room ${pin}`);
      } else {
        // New player
        player = {
          socketId: socket.id,
          name: name,
          score: 0,
          alive: true,
          currentAnswer: null,
          disconnected: false
        };
        room.players.push(player);
        console.log(`${name} joined room ${pin}`);
      }
      socket.join(pin);
      
      socket.emit('joined_room', {
        player,
        gameState: room.gameState,
        questionData: room.questionData,
        currentQuestionIndex: room.currentQuestionIndex
      });
      io.to(room.hostId).emit('players_update', room.players);
    } else {
      socket.emit('join_error', 'Phòng không tồn tại hoặc đã kết thúc!');
    }
  });

  socket.on('player_submit_answer', ({ pin, answer }) => {
    const room = rooms[pin];
    if (room && room.gameState === 'question') {
      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.currentAnswer = answer;
        // Báo cho Host biết có người vừa trả lời (để hiện số lượng)
        io.to(room.hostId).emit('players_update', room.players);
      }
    }
  });

  socket.on('disconnect', () => {
    // Tìm người chơi/host để cập nhật trạng thái mất kết nối tạm thời
    for (const pin in rooms) {
      const room = rooms[pin];
      if (room.hostId === socket.id) {
        // Host mất kết nối -> Chờ 60 giây trước khi xóa phòng
        console.log(`Host disconnected from room ${pin}. Starting 60s grace period.`);
        room.hostDisconnected = true;
        room.hostDisconnectTimer = setTimeout(() => {
          console.log(`Room ${pin} deleted after host timeout.`);
          io.to(pin).emit('room_closed');
          delete rooms[pin];
        }, 60000);
      } else {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.disconnected = true;
          io.to(room.hostId).emit('players_update', room.players);
          console.log(`Player ${player.name} disconnected from room ${pin}`);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game Server running on port ${PORT}`);
});
