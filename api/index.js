const jsChessEngine = require('js-chess-engine');

const getPieceImg = (code) => {
    const filenames = {
        'K': 'wK.png', 'Q': 'wQ.png', 'R': 'wR.png', 'B': 'wB.png', 'N': 'wN.png', 'P': 'wP.png', 
        'k': 'bK.png', 'q': 'bQ.png', 'r': 'bR.png', 'b': 'bB.png', 'n': 'bN.png', 'p': 'bP.png'  
    };
    if (!filenames[code]) return '&nbsp;&nbsp;';
    
    // width="100%" forces the image to expand to fill the Karbonn's table cell
    return `<img src="/images/${filenames[code]}" width="100%" border="0" alt="${code}">`;
};

const PIECE_NAMES = {
    'K': 'White King', 'Q': 'White Queen', 'R': 'White Rook', 'B': 'White Bishop', 'N': 'White Knight', 'P': 'White Pawn',
    'k': 'Black King', 'q': 'Black Queen', 'r': 'Black Rook', 'b': 'Black Bishop', 'n': 'Black Knight', 'p': 'Black Pawn'
};

module.exports = (req, res) => {
    let { fen, selected, move, diff, color, wap_dest } = req.query;
    diff = parseInt(diff) || 1;
    color = color === 'b' ? 'b' : 'w'; 

    if (fen) fen = fen.replace(/_/g, ' ');

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
    let allLegalMoves = game.moves();
    if (selected) {
        selected = selected.toUpperCase();
        validMoves = allLegalMoves[selected] || [];
    }

    // --- HTML 3.2 BULLETPROOF TABLE ---
    // We wrap it in a div for Opera Mini/PC, but the Karbonn will just read the 100% width table.
    let htmlBoard = '<div style="max-width: 400px; width: 100%; margin: 0 auto;"><table width="100%" border="1" cellpadding="0" cellspacing="0">';
    const ranks = color === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    const files = color === 'w' ? [65, 66, 67, 68, 69, 70, 71, 72] : [72, 71, 70, 69, 68, 67, 66, 65];

    for (let rank of ranks) {
        htmlBoard += '<tr>';
        for (let fileCode of files) {
            const file = String.fromCharCode(fileCode);
            const square = `${file}${rank}`;
            const piece = board[square];
            
            let isDarkSquare = (fileCode + rank) % 2 === 0;
            // Using standard HEX codes without CSS
            let bgColor = isDarkSquare ? '#D18B47' : '#FFCE9E';
            
            if (selected === square) bgColor = '#FFED4A'; 
            if (validMoves.includes(square)) bgColor = '#7BDE7B'; 

            let cellContent = piece ? getPieceImg(piece) : '';
            const isPlayerPiece = piece && (color === 'w' ? piece === piece.toUpperCase() : piece === piece.toLowerCase());
            
            if (validMoves.includes(square)) {
                // Using the ancient <font> tag because dumbphones respect it over CSS
                let targetImg = piece ? getPieceImg(piece) : '<font size="6" color="#000000">&bull;</font>';
                cellContent = `<a href="?fen=${safeFen}&move=${selected}-${square}&diff=${diff}&color=${color}">${targetImg}</a>`;
            } else if (isPlayerPiece) {
                cellContent = `<a href="?fen=${safeFen}&selected=${square}&diff=${diff}&color=${color}">${getPieceImg(piece)}</a>`;
            }

            // The bgcolor attribute natively forces the cell color without CSS parsing errors
            htmlBoard += `<td width="12%" align="center" valign="middle" bgcolor="${bgColor}">${cellContent}</td>`;
        }
        htmlBoard += '</tr>';
    }
    htmlBoard += '</table></div>';

    // --- WAP FORM ---
    let wapForm = '';
    if (!gameState.isFinished) {
        if (selected) {
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
            let options = Object.keys(allLegalMoves).map(sq => {
                let p = board[sq];
                return `<option value="${sq}">${sq} (${PIECE_NAMES[p] || p})</option>`;
            }).join('');
            
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
            <title>Opera Chess</title>
        </head>
        <body bgcolor="#eeeeee" text="#000000" style="font-family: sans-serif; text-align: center; margin: 0; padding: 5px;">
            <h4 style="margin: 5px 0;">Opera Chess</h4>
            <p style="color: #cc0000; font-weight: bold; font-size: 16px; margin: 5px 0;">${message}</p>
            
            ${htmlBoard}

            ${wapForm}

            ${selected ? `<p style="margin: 5px 0;"><a href="?fen=${safeFen}&diff=${diff}&color=${color}" style="color:red; font-size: 16px;">[ Cancel Selection ]</a></p>` : ''}

            <div style="margin-top: 10px; font-size: 16px;">
                <p style="margin-bottom: 5px;">AI Difficulty:</p>
                ${[0, 1, 2, 3, 4].map(level => `
                    <a href="?fen=${safeFen}&diff=${level}&color=${color}" style="margin: 0 5px; ${level === diff ? 'font-weight: bold; color: #000; text-decoration: none;' : 'color: #0066cc;'}">Lvl ${level}</a>
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
