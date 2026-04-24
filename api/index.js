const jsChessEngine = require('js-chess-engine');

// We are completely ditching text. 
// These pull tiny, pre-compressed PNGs of classic chess pieces.
const getPieceImg = (code) => {
    const urls = {
        'K': '4/42/Chess_klt45.svg/32px-Chess_klt45.svg.png', // White King
        'Q': '1/15/Chess_qlt45.svg/32px-Chess_qlt45.svg.png', // White Queen
        'R': '7/72/Chess_rlt45.svg/32px-Chess_rlt45.svg.png', // White Rook
        'B': 'b/b1/Chess_blt45.svg/32px-Chess_blt45.svg.png', // White Bishop
        'N': '7/70/Chess_nlt45.svg/32px-Chess_nlt45.svg.png', // White Knight
        'P': '4/45/Chess_plt45.svg/32px-Chess_plt45.svg.png', // White Pawn
        'k': 'f/f0/Chess_kdt45.svg/32px-Chess_kdt45.svg.png', // Black King
        'q': '4/47/Chess_qdt45.svg/32px-Chess_qdt45.svg.png', // Black Queen
        'r': 'f/ff/Chess_rdt45.svg/32px-Chess_rdt45.svg.png', // Black Rook
        'b': '9/98/Chess_bdt45.svg/32px-Chess_bdt45.svg.png', // Black Bishop
        'n': 'e/ef/Chess_ndt45.svg/32px-Chess_ndt45.svg.png', // Black Knight
        'p': 'c/c7/Chess_pdt45.svg/32px-Chess_pdt45.svg.png'  // Black Pawn
    };
    if (!urls[code]) return '&nbsp;&nbsp;';
    return `<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/${urls[code]}" width="24" height="24" border="0" style="display:block; margin:auto; border:none; outline:none;" alt="${code}">`;
};

module.exports = (req, res) => {
    let { fen, selected, move, diff } = req.query;
    diff = parseInt(diff) || 1;

    // Decode Opera Mini's safe URLs back to spaces
    if (fen) {
        fen = fen.replace(/_/g, ' ');
    }

    let game;
    let message = "Your turn (White).";

    try {
        game = new jsChessEngine.Game(fen || undefined);
    } catch (e) {
        game = new jsChessEngine.Game();
        message = "Game reset due to corrupted state.";
    }

    if (move) {
        const [from, to] = move.split('-');
        try {
            game.move(from, to);
            
            const state = game.exportJson();
            if (!state.isFinished) {
                game.ai(diff);
            }
            
            selected = null;
            
            const newState = game.exportJson();
            if (newState.isFinished) {
                message = newState.checkMate ? "Checkmate! Game Over." : "Game Over: Draw.";
            } else if (newState.check) {
                message = "Check!";
            }
        } catch (e) {
            message = "Invalid move (" + from + "-" + to + "): " + e.message;
            selected = null;
        }
    }

    // Encode spaces to underscores for Opera Mini URL safety
    const safeFen = game.exportFEN().replace(/ /g, '_');
    const gameState = game.exportJson();
    const board = gameState.pieces;

    let validMoves = [];
    if (selected) {
        const allLegalMoves = game.moves();
        validMoves = allLegalMoves[selected] || [];
    }

    let htmlBoard = '<table style="border-collapse: collapse; margin: 10px auto; border: 2px solid #333;">';
    
    for (let rank = 8; rank >= 1; rank--) {
        htmlBoard += '<tr>';
        for (let fileCode = 65; fileCode <= 72; fileCode++) {
            const file = String.fromCharCode(fileCode);
            const square = `${file}${rank}`;
            const piece = board[square];
            
            let isDarkSquare = (fileCode + rank) % 2 === 0;
            let bgColor = isDarkSquare ? '#D18B47' : '#FFCE9E';
            
            if (selected === square) bgColor = '#FFED4A'; // Yellow highlight
            if (validMoves.includes(square)) bgColor = '#7BDE7B'; // Green valid move

            let cellContent = piece ? getPieceImg(piece) : '';
            
            if (validMoves.includes(square)) {
                // The target square is empty or has an enemy piece
                let targetImg = piece ? getPieceImg(piece) : '<div style="width:12px; height:12px; background:rgba(0,0,0,0.3); border-radius:50%; margin:auto;"></div>';
                cellContent = `<a href="?fen=${safeFen}&move=${selected}-${square}&diff=${diff}" style="display:block; width:100%; height:100%; text-decoration:none;">${targetImg}</a>`;
            } else if (piece && piece === piece.toUpperCase()) {
                // Selectable White piece
                cellContent = `<a href="?fen=${safeFen}&selected=${square}&diff=${diff}" style="display:block; width:100%; height:100%; text-decoration:none;">${getPieceImg(piece)}</a>`;
            }

            htmlBoard += `<td style="width: 32px; height: 32px; padding: 0; text-align: center; vertical-align: middle; background-color: ${bgColor}; border: 1px solid #666;">${cellContent}</td>`;
        }
        htmlBoard += '</tr>';
    }
    htmlBoard += '</table>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Opera Chess</title>
            <style>
                body { font-family: sans-serif; text-align: center; background: #eee; margin: 0; padding: 5px; }
                a { color: #000; text-decoration: none; }
                .diff-controls { margin-top: 15px; font-size: 14px; }
                .diff-controls a { text-decoration: underline; color: #0066cc; }
                .diff-controls a.active { font-weight: bold; text-decoration: none; color: #000; }
                img { display: block; border: 0; outline: none; }
            </style>
        </head>
        <body>
            <h4>Opera Chess</h4>
            <p style="color: #c00; font-weight: bold; font-size: 14px;">${message}</p>
            
            ${htmlBoard}

            ${selected ? `<p><a href="?fen=${safeFen}&diff=${diff}" style="color:red;">[ Cancel Selection ]</a></p>` : '<p>&nbsp;</p>'}

            <div class="diff-controls">
                <p style="margin-bottom: 5px;">AI Difficulty:</p>
                ${[0, 1, 2, 3, 4].map(level => `
                    <a href="?fen=${safeFen}&diff=${level}" class="${level === diff ? 'active' : ''}">Lvl ${level}</a>
                `).join(' | ')}
            </div>
            
            <p style="margin-top:20px; font-size: 14px;">
                <a href="?diff=${diff}" style="color: #c00;">[ Restart Game ]</a>
            </p>
        </body>
        </html>
    `);
};
