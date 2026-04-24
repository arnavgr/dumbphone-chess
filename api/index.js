const jsChessEngine = require('js-chess-engine');

const getPieceImg = (code) => {
    const filenames = {
        'K': 'wK.png', 'Q': 'wQ.png', 'R': 'wR.png', 'B': 'wB.png', 'N': 'wN.png', 'P': 'wP.png', 
        'k': 'bK.png', 'q': 'bQ.png', 'r': 'bR.png', 'b': 'bB.png', 'n': 'bN.png', 'p': 'bP.png'  
    };
    if (!filenames[code]) return '&nbsp;&nbsp;';
    
    // Explicit sizing without CSS overrides, keeping border="0" to stop ugly blue link boxes
    return `<img src="/images/${filenames[code]}" width="28" height="28" border="0" alt="${code}">`;
};

module.exports = (req, res) => {
    let { fen, selected, move, diff, color } = req.query;
    diff = parseInt(diff) || 1;
    color = color === 'b' ? 'b' : 'w'; 

    if (fen) fen = fen.replace(/_/g, ' ');

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
    if (selected) {
        selected = selected.toUpperCase();
        const allLegalMoves = game.moves();
        validMoves = allLegalMoves[selected] || [];
    }

    // FIX 1: Use HTML width="98%" instead of CSS width, so old browsers stretch it properly
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
            
            // FIX 2: Removed display:block CSS. Use standard inline links. 
            // Replaced CSS circles with standard HTML bullets (&bull;) for dumbphone focus engines.
            if (validMoves.includes(square)) {
                let targetImg = piece ? getPieceImg(piece) : '<b style="color:#222; font-size:24px; line-height:28px;">&bull;</b>';
                cellContent = `<a href="?fen=${safeFen}&move=${selected}-${square}&diff=${diff}&color=${color}">${targetImg}</a>`;
            } else if (isPlayerPiece) {
                cellContent = `<a href="?fen=${safeFen}&selected=${square}&diff=${diff}&color=${color}">${getPieceImg(piece)}</a>`;
            }

            // FIX 3: HTML alignment and relative 12.5% width
            htmlBoard += `<td width="12.5%" align="center" valign="middle" style="height: 36px; padding: 0; background-color: ${bgColor}; border: 1px solid #666;">${cellContent}</td>`;
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
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="HandheldFriendly" content="true">
            <meta name="MobileOptimized" content="320">
            <title>Opera Chess</title>
            <style>
                body { font-family: sans-serif; text-align: center; background: #eee; margin: 0; padding: 2px; }
                a { color: #000; text-decoration: none; }
                .diff-controls { margin-top: 10px; font-size: 16px; }
                .diff-controls a { text-decoration: underline; color: #0066cc; }
                .diff-controls a.active { font-weight: bold; text-decoration: none; color: #000; }
            </style>
        </head>
        <body>
            <h4 style="margin: 5px 0;">Opera Chess</h4>
            <p style="color: #c00; font-weight: bold; font-size: 16px; margin: 5px 0;">${message}</p>
            
            ${htmlBoard}

            ${selected ? `<p style="margin: 5px 0;"><a href="?fen=${safeFen}&diff=${diff}&color=${color}" style="color:red; font-size: 16px;">[ Cancel Selection ]</a></p>` : '<p style="margin: 5px 0;">&nbsp;</p>'}

            <div class="diff-controls">
                <p style="margin-bottom: 5px;">AI Difficulty:</p>
                ${[0, 1, 2, 3, 4].map(level => `
                    <a href="?fen=${safeFen}&diff=${level}&color=${color}" class="${level === diff ? 'active' : ''}">Lvl ${level}</a>
                `).join(' | ')}
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
