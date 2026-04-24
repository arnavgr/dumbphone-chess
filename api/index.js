const jsChessEngine = require('js-chess-engine');

// Look for local images in the public/images folder
const getPieceImg = (code) => {
    const filenames = {
        'K': 'wK.png', 'Q': 'wQ.png', 'R': 'wR.png', 'B': 'wB.png', 'N': 'wN.png', 'P': 'wP.png', 
        'k': 'bK.png', 'q': 'bQ.png', 'r': 'bR.png', 'b': 'bB.png', 'n': 'bN.png', 'p': 'bP.png'  
    };
    if (!filenames[code]) return '&nbsp;&nbsp;';
    
    // We use an absolute path so Opera Mini doesn't get confused during proxy compression
    return `<img src="/images/${filenames[code]}" width="24" height="24" border="0" style="display:block; margin:auto; border:none; outline:none;" alt="${code}">`;
};

module.exports = (req, res) => {
    let { fen, selected, move, diff, color } = req.query;
    diff = parseInt(diff) || 1;
    color = color === 'b' ? 'b' : 'w'; // Default to White

    if (fen) fen = fen.replace(/_/g, ' ');

    let game;
    let message = `Your turn (${color === 'w' ? 'White' : 'Black'}).`;

    try {
        game = new jsChessEngine.Game(fen || undefined);
        
        // If it's a brand new game and the player chose Black, the AI moves first
        if (!fen && color === 'b') {
            game.aiMove(diff);
        }
    } catch (e) {
        game = new jsChessEngine.Game();
        message = "Game reset due to corrupted FEN.";
        if (color === 'b') game.aiMove(diff); // Ensure AI moves first on a reset to Black
    }

    if (move) {
        let [from, to] = move.split('-');
        from = from.toUpperCase();
        to = to.toUpperCase();
        
        let moveSuccessful = false;

        try {
            game.move(from, to);
            moveSuccessful = true;
            selected = null;
        } catch (e) {
            message = "Invalid player move (" + from + "-" + to + "): " + e.message;
            selected = null;
        }

        if (moveSuccessful) {
            const state = game.exportJson();
            if (!state.isFinished) {
                try {
                    game.aiMove(diff); 
                } catch (aiError) {
                    message = "AI Error: " + aiError.message;
                }
            }
            
            const newState = game.exportJson();
            if (newState.isFinished) {
                message = newState.checkMate ? "Checkmate! Game Over." : "Game Over: Draw.";
            } else if (newState.check) {
                message = "Check!";
            }
        }
    }

    const safeFen = game.exportFEN().replace(/ /g, '_');
    const gameState = game.exportJson();
    const board = gameState.pieces;

    let validMoves = [];
    if (selected) {
        selected = selected.toUpperCase();
        const allLegalMoves = game.moves();
        validMoves = allLegalMoves[selected] || [];
    }

    let htmlBoard = '<table style="border-collapse: collapse; margin: 10px auto; border: 2px solid #333;">';
    
    // Flip the board rendering based on player color
    const ranks = color === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = color === 'w' ? [65, 66, 67, 68, 69, 70, 71, 72] : [72, 71, 70, 69, 68, 67, 66, 65];

    for (let rank of ranks) {
        htmlBoard += '<tr>';
        for (let fileCode of files) {
            const file = String.fromCharCode(fileCode);
            const square = `${file}${rank}`;
            const piece = board[square];
            
            let isDarkSquare = (fileCode + rank) % 2 === 0;
            let bgColor = isDarkSquare ? '#D18B47' : '#FFCE9E';
            
            if (selected === square) bgColor = '#FFED4A'; 
            if (validMoves.includes(square)) bgColor = '#7BDE7B'; 

            let cellContent = piece ? getPieceImg(piece) : '';
            
            // Check if the piece belongs to the current player
            const isPlayerPiece = piece && (color === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());
            
            if (validMoves.includes(square)) {
                let targetImg = piece ? getPieceImg(piece) : '<div style="width:12px; height:12px; background:rgba(0,0,0,0.3); border-radius:50%; margin:auto;"></div>';
                cellContent = `<a href="?fen=${safeFen}&move=${selected}-${square}&diff=${diff}&color=${color}" style="display:block; width:100%; height:100%; text-decoration:none;">${targetImg}</a>`;
            } else if (isPlayerPiece) {
                cellContent = `<a href="?fen=${safeFen}&selected=${square}&diff=${diff}&color=${color}" style="display:block; width:100%; height:100%; text-decoration:none;">${getPieceImg(piece)}</a>`;
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

            ${selected ? `<p><a href="?fen=${safeFen}&diff=${diff}&color=${color}" style="color:red;">[ Cancel Selection ]</a></p>` : '<p>&nbsp;</p>'}

            <div class="diff-controls">
                <p style="margin-bottom: 5px;">AI Difficulty:</p>
                ${[0, 1, 2, 3, 4].map(level => `
                    <a href="?fen=${safeFen}&diff=${level}&color=${color}" class="${level === diff ? 'active' : ''}">Lvl ${level}</a>
                `).join(' | ')}
            </div>
            
            <div style="margin-top:20px; font-size: 14px; line-height: 1.8;">
                <p style="margin-bottom: 5px; font-weight: bold;">Restart Game:</p>
                <a href="?diff=${diff}&color=w" style="color: #0066cc;">[ Play as White ]</a><br>
                <a href="?diff=${diff}&color=b" style="color: #0066cc;">[ Play as Black ]</a>
            </div>
        </body>
        </html>
    `);
};
