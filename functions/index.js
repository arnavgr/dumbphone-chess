// Cloudflare Pages Function — Dumbphone Chess
// Place at: functions/index.js
import { Game } from '../js-chess-engine.js';

// -------------------------------------------------------------------
// External AI: call a remote Stockfish API to avoid CPU timeouts.
// -------------------------------------------------------------------
const fetchRemoteAiMove = async (fen, depth = 10) => {
    try {
        const response = await fetch("https://chess-api.com/v1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fen: fen, depth: depth })
        });
        if (!response.ok) return null;

        const data = await response.json();
        if (data && data.from && data.to) {
            return {
                from: data.from.toUpperCase(),
                to:   data.to.toUpperCase()
            };
        }
    } catch (e) {
        // Network errors → we fall back later
    }
    return null;
};

// -------------------------------------------------------------------
// Utility: get a random legal move (for difficulty 0 or fallback)
// -------------------------------------------------------------------
async function randomAiMove(game) {
    const allMoves = game.moves();   
    const fromList = Object.keys(allMoves);
    if (!fromList.length) return null;
    const from = fromList[Math.floor(Math.random() * fromList.length)];
    const toList = allMoves[from];
    const to = toList[Math.floor(Math.random() * toList.length)];
    return { from, to };
}

// -------------------------------------------------------------------
// Utility: call remote API, fallback to random move if it fails
// -------------------------------------------------------------------
async function remoteOrRandomMove(game, diff) {
    const depths = { 1: 2, 2: 5, 3: 10, 4: 18 };
    const depth = depths[diff] || 10;
    
    const fen = game.exportFEN();
    const move = await fetchRemoteAiMove(fen, depth);
    if (move) return move;
    
    return randomAiMove(game);
}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
const PIECE_FILES = {
    K:'wK',Q:'wQ',R:'wR',B:'wB',N:'wN',P:'wP',
    k:'bK',q:'bQ',r:'bR',b:'bB',n:'bN',p:'bP',
};

// SHRUNK: Image size reduced from 24x24 to 20x20
const getPieceImg = (code) => {
    const f = PIECE_FILES[code];
    if (!f) return '';
    return `<img src="/images/${f}.png" width="20" height="20" alt="${code}" style="display:block;margin:auto;border:0;">`;
};

// SHRUNK: Spacer reduced from 32x32 to 24x24
const CELL_SPACER = '<div style="width:24px;height:24px;"></div>';

const buildPage = ({ message, msgColor, htmlBoard, safeFen, selected, diff, color }) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="format-detection" content="telephone=no">
<meta name="robots" content="noindex,nofollow">
<title>Dumbphone Chess</title>
<style>
body{font-family:sans-serif;text-align:center;background:#eee;margin:0;padding:2px;}
a{color:#000;text-decoration:none;}
h4{margin:2px 0;}
.msg{font-size:13px;font-weight:bold;margin:2px 0;min-height:16px;}
.controls{margin-top:8px;font-size:12px;}
.controls a{text-decoration:underline;color:#0066cc;padding:2px;}
.controls a.on{font-weight:bold;text-decoration:none;color:#000;}
.section{margin-top:10px;font-size:12px;line-height:1.6;}
img{border:0;display:block;}
</style>
</head>
<body>
<h4>Dumbphone Chess</h4>
<p class="msg" style="color:${msgColor};">${message}</p>

${htmlBoard}

${selected
    ? `<p style="margin:4px 0;"><a href="/?fen=${safeFen}&diff=${diff}&color=${color}" style="color:red;font-size:12px;">[Cancel]</a></p>`
    : '<p style="margin:4px 0;">&nbsp;</p>'}

<div class="controls">
<span>Difficulty: </span>
${[0,1,2,3,4].map(l =>
    `<a href="/?fen=${safeFen}&diff=${l}&color=${color}"${l===diff?' class="on"':''}>${l}</a>`
).join(' ')}
</div>

<div class="section">
<b>New game:</b><br>
<a href="/?diff=${diff}&color=w">[White]</a>
&nbsp;
<a href="/?diff=${diff}&color=b">[Black]</a>
</div>
</body>
</html>`;

// -------------------------------------------------------------------
// Main handler
// -------------------------------------------------------------------
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const q   = url.searchParams;

    let fen       = q.get('fen')      || null;
    let selected  = q.get('selected') || null;
    const moveParam = q.get('move')   || null;
    let color     = q.get('color') === 'b' ? 'b' : 'w';

    let diff = parseInt(q.get('diff'));
    if (isNaN(diff) || diff < 0) diff = 1;
    else if (diff > 4)           diff = 4;

    if (fen) fen = fen.replace(/_/g, ' ');

    if (selected) {
        selected = selected.toUpperCase();
        if (!/^[A-H][1-8]$/.test(selected)) selected = null;
    }

    let game;
    let message  = `Your turn (${color === 'w' ? 'White' : 'Black'}).`;
    let msgColor = '#006600';

    try {
        game = new Game(fen || undefined);
        if (!fen && color === 'b') {
            const aiMove = diff === 0
                ? await randomAiMove(game)
                : await remoteOrRandomMove(game, diff);
            if (aiMove) {
                game.move(aiMove.from, aiMove.to);
            } else {
                message  = 'AI could not move.';
                msgColor = '#cc0000';
            }
        }
    } catch (e) {
        game    = new Game();
        message = 'Game reset (corrupted).';
        msgColor = '#cc0000';
        if (color === 'b') {
            const aiMove = diff === 0
                ? await randomAiMove(game)
                : await remoteOrRandomMove(game, diff);
            if (aiMove) game.move(aiMove.from, aiMove.to);
        }
    }

    if (moveParam) {
        const parts = moveParam.split('-');
        if (parts.length === 2) {
            const from = parts[0].toUpperCase();
            const to   = parts[1].toUpperCase();

            if (/^[A-H][1-8]$/.test(from) && /^[A-H][1-8]$/.test(to)) {
                let moveOk = false;
                try {
                    game.move(from, to);
                    moveOk   = true;
                    selected = null;
                } catch (e) {
                    message  = `Illegal move ${from}→${to}.`;
                    msgColor = '#cc0000';
                    selected = null;
                }

                if (moveOk) {
                    const mid = game.exportJson();
                    if (!mid.isFinished) {
                        let aiMove;
                        try {
                            aiMove = diff === 0
                                ? await randomAiMove(game)
                                : await remoteOrRandomMove(game, diff);
                        } catch (aiError) {
                            message  = 'AI Error: ' + aiError.message;
                            msgColor = '#cc0000';
                        }

                        if (aiMove) {
                            try {
                                game.move(aiMove.from, aiMove.to);
                            } catch (moveErr) {
                                const fallback = await randomAiMove(game);
                                if (fallback) game.move(fallback.from, fallback.to);
                            }
                        }
                    }

                    const fin = game.exportJson();
                    if (fin.isFinished) {
                        message  = fin.checkMate ? 'Checkmate! Game over.' : 'Draw. Game over.';
                        msgColor = '#000099';
                    } else if (fin.check) {
                        message  = 'Check!';
                        msgColor = '#cc0000';
                    } else {
                        message  = `Your turn (${color === 'w' ? 'White' : 'Black'}).`;
                        msgColor = '#006600';
                    }
                }
            }
        }
    }

    const safeFen   = game.exportFEN().replace(/ /g, '_');
    const gameState = game.exportJson();
    const board     = gameState.pieces;
    const isOver    = gameState.isFinished;

    let validMoves = [];
    if (selected && !isOver) {
        const allLegal = game.moves();
        validMoves = allLegal[selected] || [];
    }

    const ranks = color === 'w' ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
    const files = color === 'w'
        ? ['A','B','C','D','E','F','G','H']
        : ['H','G','F','E','D','C','B','A'];

    let htmlBoard = `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:4px auto;border:2px solid #333;">`;

    // SHRUNK: Top coordinate row (12px height)
    htmlBoard += '<tr><td style="background:#ccc; width:12px; height:12px; font-size:9px; text-align:center; vertical-align:middle;"></td>';
    for (const file of files) {
        htmlBoard += `<td style="background:#ccc; width:24px; height:12px; font-size:9px; text-align:center; vertical-align:middle;">${file}</td>`;
    }
    htmlBoard += '<td style="background:#ccc; width:12px; height:12px;"></td></tr>';

    for (const rank of ranks) {
        // SHRUNK: Left rank label (12px width)
        htmlBoard += `<tr><td style="background:#ccc; width:12px; font-size:9px; text-align:center; vertical-align:middle;">${rank}</td>`;

        for (const file of files) {
            const square = `${file}${rank}`;
            const piece  = board[square];
            const fileCode = file.charCodeAt(0);

            const isDark = (fileCode + rank) % 2 === 0;
            let bg = isDark ? '#D18B47' : '#FFCE9E';

            if (selected === square)          bg = '#FFED4A';
            if (validMoves.includes(square))  bg = '#7BDE7B';

            const isPlayerPiece = !isOver && piece && (
                color === 'w'
                    ? piece === piece.toUpperCase()
                    : piece === piece.toLowerCase()
            );

            let inner = piece ? getPieceImg(piece) : CELL_SPACER;

            if (validMoves.includes(square)) {
                const targetContent = piece
                    ? getPieceImg(piece)
                    // SHRUNK: Valid move dot reduced to 10x10
                    : '<div style="width:10px;height:10px;background:rgba(0,0,0,.4);border-radius:50%;margin:auto;"></div>';
                // SHRUNK: Anchor tag size reduced to 24x24
                inner = `<a href="/?fen=${safeFen}&move=${selected}-${square}&diff=${diff}&color=${color}" style="display:block;width:24px;height:24px;text-decoration:none;">${targetContent}</a>`;
            } else if (isPlayerPiece) {
                inner = `<a href="/?fen=${safeFen}&selected=${square}&diff=${diff}&color=${color}" style="display:block;width:24px;height:24px;text-decoration:none;">${getPieceImg(piece)}</a>`;
            }

            // SHRUNK: Table cell reduced to 24x24
            htmlBoard += `<td width="24" height="24" style="width:24px;height:24px;min-width:24px;min-height:24px;padding:0;text-align:center;vertical-align:middle;background-color:${bg};border:1px solid #666;">${inner}</td>`;
        }

        // SHRUNK: Right rank label
        htmlBoard += `<td style="background:#ccc; width:12px; font-size:9px; text-align:center; vertical-align:middle;">${rank}</td></tr>`;
    }

    // SHRUNK: Bottom coordinate row
    htmlBoard += '<tr><td style="background:#ccc; width:12px; height:12px;"></td>';
    for (const file of files) {
        htmlBoard += `<td style="background:#ccc; width:24px; height:12px; font-size:9px; text-align:center; vertical-align:middle;">${file}</td>`;
    }
    htmlBoard += '<td style="background:#ccc; width:12px; height:12px;"></td></tr>';
    htmlBoard += '</table>';

    const html = buildPage({
        message, msgColor, htmlBoard, safeFen, selected, diff, color
    });

    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}
