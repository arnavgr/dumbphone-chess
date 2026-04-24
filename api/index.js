const jsChessEngine = require('js-chess-engine');

const getPieceImg = (code) => {
    const filenames = {
        'K': 'wK.png', 'Q': 'wQ.png', 'R': 'wR.png', 'B': 'wB.png', 'N': 'wN.png', 'P': 'wP.png', 
        'k': 'bK.png', 'q': 'bQ.png', 'r': 'bR.png', 'b': 'bB.png', 'n': 'bN.png', 'p': 'bP.png'  
    };
    if (!filenames[code]) return '&nbsp;&nbsp;';
    return `<img src="/images/${filenames[code]}" width="28" height="28" border="0" alt="${code}">`;
};

// Plain text names for the Karbonn dropdown menu
const PIECE_NAMES = {
    'K': 'White King', 'Q': 'White Queen', 'R': 'White Rook', 'B': 'White Bishop', 'N': 'White Knight', 'P': 'White Pawn',
    'k': 'Black King', 'q': 'Black Queen', 'r': 'Black Rook', 'b': 'Black Bishop', 'n': 'Black Knight', 'p': 'Black Pawn'
};

module.exports = (req, res) => {
    let { fen, selected, move, diff, color, wap_dest } = req.query;
    diff = parseInt(diff) || 1;
    color = color === 'b' ? 'b' : 'w'; 

    if (fen) fen = fen.replace(/_/g, ' ');

    // Karbonn Form Fallback Handler
    if (wap_dest && selected) {
        move = `${selected}-${wap_dest}`;
    }

    let game;
    let message = `Your turn (${color === 'w' ? 'White' : 'Black'}).`;

    try {
        game = new jsChessEngine.Game(fen || undefined);
        if (!fen && color === 'b') {
            game.aiMove(diff);
        }
    } catch (e) {
        game = new jsChessEngine.Game();
        message = "Game reset due to corrupted FEN.";
        if (color === 'b') game.aiMove(diff); 
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
            selected = null; // Clear selection on invalid move
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
    let allLegalMoves = game.moves();
    if (selected) {
        selected = selected.toUpperCase();
        validMoves = allLegalMoves[selected] || [];
    }

    // --- 1. BUILD THE CHESSBOARD ---
    let htmlBoard = '<table width="98%" border="1" style="border-collapse: collapse; margin: 5px auto; border: 2px solid #333; max-width: 400px;">';
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
            const isPlayerPiece = piece && (color === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());
            
            if (validMoves.includes(square)) {
                let targetImg = piece ? getPieceImg(piece) : '<b style="color:#222; font-size:24px;">&bull;</b>';
                cellContent = `<a href="?fen=${safeFen}&move=${selected}-${square}&diff=${diff}&color=${color}">${targetImg}</a>`;
            } else if (isPlayerPiece) {
                cellContent = `<a href="?fen=${safeFen}&selected=${square}&diff=${diff}&color=${color}">${getPieceImg(piece)}</a>`;
            }

            htmlBoard += `<td width="12.5%" align="center" valign="middle" style="height: 36px; padding: 0; background-color: ${bgColor}; border: 1px solid #666;">${cellContent}</td>`;
        }
        htmlBoard += '</tr>';
    }
    htmlBoard += '</table>';

    // --- 2. BUILD THE KARBONN FORM FALLBACK ---
    let wapForm = '';
    // Only show form if game isn't over
    if (!gameState.isFinished) {
        if (selected) {
            // Dropdown to choose destination
            let options = validMoves.map(d => `<option value="${d}">${d}</option>`).join('');
            wapForm = `
                <form action="/" method="GET" style="margin: 15px 0; background: #ddd; padding: 10px; border: 1px solid #999;">
                    <input type="hidden" name="fen" value="${safeFen}">
                    <input type="hidden" name="diff" value="${diff}">
                    <input type="hidden" name="color" value="${color}">
                    <input type="hidden" name="selected" value="${selected}">
                    <b>Move ${selected} to:</b><br>
                    <select name="wap_dest" style="margin-top: 5px;">${options}</select>
                    <input type="submit" value="Move">
                </form>
            `;
        } else {
            // Dropdown to choose starting piece
            let options = Object.keys(allLegalMoves).map(sq => {
                let p = board[sq];
                return `<option value="${sq}">${sq} (${PIECE_NAMES[p] || p})</option>`;
            }).join('');
            
            // Only show form if player has moves
            if (options) {
                wapForm = `
                    <form action="/" method="GET" style="margin: 15px 0; background: #ddd; padding: 10px; border: 1px solid #999;">
                        <input type="hidden" name="fen" value="${safeFen}">
                        <input type="hidden" name="diff" value="${diff}">
                        <input type="hidden" name="color" value="${color}">
                        <b>Select Piece:</b><br>
                        <select name="selected" style="margin-top: 5px;">${options}</select>
                        <input type="submit" value="Select">
                    </form>
                `;
            }
        }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta name="HandheldFriendly" content="true">
            <title>Opera Chess</title>
            <style>
                body { font-family: sans-serif; text-align: center; background: #eee; margin: 0; padding: 2px; }
                a { color: #000; text-decoration: none; }
                .diff-controls { margin-top: 10px; font-size: 16px; }
                .diff-controls a { text-decoration: underline; color: #0066cc; margin: 0 5px; }
                .diff-controls a.active { font-weight: bold; text-decoration: none; color: #000; }
            </style>
        </head>
        <body>
            <h4 style="margin: 5px 0;">Opera Chess</h4>
            <p style="color: #c00; font-weight: bold; font-size: 16px; margin: 5px 0;">${message}</p>
            
            ${htmlBoard}

            ${wapForm}

            ${selected ? `<p style="margin: 5px 0;"><a href="?fen=${safeFen}&diff=${diff}&color=${color}" style="color:red; font-size: 16px;">[ Cancel Selection ]</a></p>` : ''}

            <div class="diff-controls">
                <p style="margin-bottom: 5px;">AI Difficulty:</p>
                ${[0, 1, 2, 3, 4].map(level => `
                    <a href="?fen=${safeFen}&diff=${level}&color=${color}" class="${level === diff ? 'active' : ''}">Lvl ${level}</a>
                `).join('')}
            </div>
            
            <div style="margin-top:15px; font-size: 16px; line-height: 1.8;">
                <p style="margin-bottom: 5px; font-weight: bold;">Restart Game:</p>
                <a href="?diff=${diff}&color=w" style="color: #0066cc;">[ Play as White ]</a><br>
                <a href="?diff=${diff}&color=b" style="color: #0066cc;">[ Play as Black ]</a>
            </div>
        </body>
        </html>
    `);
};
