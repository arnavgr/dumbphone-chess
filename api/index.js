const jsChessEngine = require('js-chess-engine');

// Base64 Encoded Chess Pieces (Pixel-Art Style for low-memory browsers)
const BASE64_PIECES = {
    'K': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAbUlEQVRIx2NgGAWjYBSMglEwCkbBSAMMoI6B4f9/Bv7/YCH0ByD/P5SNoY8BIsYIAn+AbAx9DBCBf0D2f4Z/UPofLMT+AAx9DBCBf0D2f4Z/UPofLMTeAOP/f9D8D0R/pID/DPr/R9EowA0AANpAKK0F79GfAAAAAElFTkSuQmCC',
    'Q': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAdElEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v//D8L/oZgBeAALfIDyMfRRDBCBf0D2f4Z/UPofLMT+AAx9DBCBf0D2f4Z/UPofLMTeAOP/f9D8D0R/pID/DPr/R9EowA0AANpAKK0F79GfAAAAAElFTkSuQmCC',
    'R': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAbUlEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAX8h/Ix9FEMEIF/QPZ/hn9Q+h8sxN4A4/9/0PwPRH+kgP8M+v9H0SjADQAA2kAorQXv0Z8AAAAASUVORK5CYII=',
    'B': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAZklEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAW+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'N': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAb0lEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAX8h/Ix9FEMEIF/QPZ/hn9Q+h8sxN4A4/9/0PwPRH+kgP8M+v9H0SjADQAA2kAorQXv0Z8AAAAASUVORK5CYII=',
    'P': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAYUlEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAX+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'k': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAdUlEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAU+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'q': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAdUlEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAU+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'r': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAbUlEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAU+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'b': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAZklEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAU+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'n': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAb0lEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAU+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII=',
    'p': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAYklEQVRIx2NgGAWjYBSMglEwCkbBSAMMDKAG/v8H4f9QzAA8gAU+Q/kY+igGiMA/IPs/wz8o/Q8WYm+A8f8/aP4Hoj9SwH8G/f+jaBTgBgAAbSAUrQXv0Z8AAAAASUVORK5CYII='
};

const getPieceImg = (code) => {
    const data = BASE64_PIECES[code];
    if (!data) return '&nbsp;&nbsp;';
    return `<img src="${data}" width="24" height="24" border="0" style="display:block; margin:auto; border:none;" alt="${code}">`;
};

module.exports = (req, res) => {
    let { fen, selected, move, diff } = req.query;
    diff = parseInt(diff) || 1;

    if (fen) fen = fen.replace(/_/g, ' ');

    let game;
    let message = "Your turn (White).";

    try {
        game = new jsChessEngine.Game(fen || undefined);
    } catch (e) {
        game = new jsChessEngine.Game();
        message = "Board reset.";
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
            message = "Invalid move: " + from + "-" + to;
            selected = null;
        }

        if (moveSuccessful) {
            const state = game.exportJson();
            if (!state.isFinished) {
                try {
                    game.aiMove(diff);
                } catch (aiError) {}
            }
            const newState = game.exportJson();
            if (newState.isFinished) {
                message = newState.checkMate ? "Checkmate!" : "Draw.";
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
    for (let rank = 8; rank >= 1; rank--) {
        htmlBoard += '<tr>';
        for (let fileCode = 65; fileCode <= 72; fileCode++) {
            const file = String.fromCharCode(fileCode);
            const square = `${file}${rank}`;
            const piece = board[square];
            const isDark = (fileCode + rank) % 2 === 0;
            let bgColor = isDark ? '#D18B47' : '#FFCE9E';
            if (selected === square) bgColor = '#FFED4A';
            if (validMoves.includes(square)) bgColor = '#7BDE7B';

            let cellContent = piece ? getPieceImg(piece) : '';
            if (validMoves.includes(square)) {
                let target = piece ? getPieceImg(piece) : '<div style="width:8px; height:8px; background:#333; border-radius:50%; margin:auto;"></div>';
                cellContent = `<a href="?fen=${safeFen}&move=${selected}-${square}&diff=${diff}">${target}</a>`;
            } else if (piece && piece === piece.toUpperCase()) {
                cellContent = `<a href="?fen=${safeFen}&selected=${square}&diff=${diff}">${getPieceImg(piece)}</a>`;
            }

            htmlBoard += `<td style="width:32px; height:32px; text-align:center; background:${bgColor}; border:1px solid #666;">${cellContent}</td>`;
        }
        htmlBoard += '</tr>';
    }
    htmlBoard += '</table>';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;text-align:center;background:#eee;margin:0;padding:5px;}a{text-decoration:none;display:block;width:100%;height:100%;}.diff{margin-top:10px;font-size:12px;}</style></head><body><h4>Opera Chess</h4><p style="color:#c00;font-size:13px;margin:5px;">${message}</p>${htmlBoard}${selected ? `<a href="?fen=${safeFen}&diff=${diff}" style="color:red;font-size:12px;">[ Cancel ]</a>` : ''}<div class="diff">AI: ${[0,1,2,3].map(l=>`<a href="?fen=${safeFen}&diff=${l}" style="display:inline;padding:2px;${l===diff?'font-weight:bold;':''}">L${l}</a>`).join(' ')} | <a href="?diff=${diff}" style="display:inline;color:#c00;">Reset</a></div></body></html>`);
};
