const jsChessEngine = require('js-chess-engine');

// Unicode map for chess pieces
const PIECES = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙', // White
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'  // Black
};

module.exports = (req, res) => {
    // 1. Parse URL Parameters
    let { fen, selected, move, diff } = req.query;
    diff = parseInt(diff) || 1; // Default difficulty level 1

    // 2. Initialize Game State
    const game = new jsChessEngine.Game(fen || undefined);
    let message = "Your turn (White).";

    // 3. Process Player Move & AI Response
    if (move) {
        const [from, to] = move.split('-');
        try {
            game.move(from, to);
            
            // If the game isn't over, let the AI move
            const state = game.exportJson();
            if (!state.isFinished) {
                game.ai(diff);
            }
            
            // Clear selection and update FEN after the turn
            selected = null;
            fen = game.exportFEN();
            
            const newState = game.exportJson();
            if (newState.isFinished) {
                message = newState.checkMate ? "Checkmate! Game Over." : "Game Over: Draw.";
            } else if (newState.check) {
                message = "Check!";
            }
        } catch (e) {
            message = "Invalid move.";
            selected = null;
        }
    }

    // 4. Get Current Board Data
    const currentFen = encodeURIComponent(game.exportFEN());
    const gameState = game.exportJson();
    const board = gameState.pieces; // e.g., { "E2": "P", "A8": "r" }

    // Find valid destinations if a piece is selected
    let validMoves = [];
    if (selected) {
        const allLegalMoves = game.moves();
        validMoves = allLegalMoves[selected] || [];
    }

    // 5. Generate the HTML Board (Dumbphone optimized)
    let htmlBoard = '<table style="border-collapse: collapse; margin: 10px auto; border: 2px solid #333;">';
    
    // Loop through Ranks (8 down to 1) and Files (A to H)
    for (let rank = 8; rank >= 1; rank--) {
        htmlBoard += '<tr>';
        for (let fileCode = 65; fileCode <= 72; fileCode++) {
            const file = String.fromCharCode(fileCode); // 'A', 'B', etc.
            const square = `${file}${rank}`;
            const piece = board[square];
            const pieceSymbol = piece ? PIECES[piece] : '&nbsp;';
            
            // Determine colors
            const isDarkSquare = (fileCode + rank) % 2 === 0;
            let bgColor = isDarkSquare ? '#D18B47' : '#FFCE9E';
            
            // Highlight selected square or valid move destinations
            if (selected === square) bgColor = '#FFED4A';
            if (validMoves.includes(square)) bgColor = '#7BDE7B';

            let cellContent = pieceSymbol;
            
            // Create clickable links for interactions
            if (validMoves.includes(square)) {
                // Link to make the move
                cellContent = `<a href="?fen=${currentFen}&move=${selected}-${square}&diff=${diff}" style="display:block;text-decoration:none;color:#000;">${pieceSymbol === '&nbsp;' ? 'x' : pieceSymbol}</a>`;
            } else if (piece && piece === piece.toUpperCase()) {
                // Link to select your own (White) piece
                cellContent = `<a href="?fen=${currentFen}&selected=${square}&diff=${diff}" style="display:block;text-decoration:none;color:#000;">${pieceSymbol}</a>`;
            }

            htmlBoard += `<td style="width: 32px; height: 32px; text-align: center; vertical-align: middle; font-size: 22px; background-color: ${bgColor}; border: 1px solid #666;">${cellContent}</td>`;
        }
        htmlBoard += '</tr>';
    }
    htmlBoard += '</table>';

    // 6. Send the Full HTML Response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Dumbphone Chess</title>
            <style>
                body { font-family: sans-serif; text-align: center; background: #eee; margin: 0; padding: 10px; }
                a { color: #0066cc; text-decoration: none; }
                .diff-controls a { margin: 0 5px; padding: 5px; border: 1px solid #ccc; background: #fff; }
                .diff-controls a.active { font-weight: bold; background: #ddd; }
            </style>
        </head>
        <body>
            <h3>Static Chess</h3>
            <p style="color: #c00; font-weight: bold;">${message}</p>
            
            ${htmlBoard}

            ${selected ? `<p><a href="?fen=${currentFen}&diff=${diff}">&lt;&lt; Cancel Selection</a></p>` : '<p>&nbsp;</p>'}

            <div class="diff-controls">
                <p>AI Difficulty:</p>
                ${[0, 1, 2, 3, 4].map(level => `
                    <a href="?fen=${currentFen}&diff=${level}" class="${level === diff ? 'active' : ''}">Lvl ${level}</a>
                `).join('')}
            </div>
            
            <p style="margin-top:20px; font-size: 12px;">
                <a href="?diff=${diff}">Restart Game</a>
            </p>
        </body>
        </html>
    `);
};
