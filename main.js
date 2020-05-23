"use strict";

const zip = rows=>rows[0].map((_,c)=>rows.map(row=>row[c]));
const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};


class GameBoard {
    constructor(row, col) {
        this.grid = [row, col];
        this._board = null;
    }

    createBoard() {
        this._board = [];
        for (let i=0; i<this.grid[0]; i++) {
            let cols = [];
            for (let j=0; j<this.grid[1]; j++) {
                cols.push(0);
            }
            this._board.push(cols);
        }
    }

    zeroes() {
        let valid = [];
		for (let i=0; i<this.grid[0]; i++) {
			for (let j=0; j<this.grid[1]; j++) {
				if (this._board[i][j] === 0) {
					valid.push(`${i}-${j}`);
				}
			}
		}
		shuffle(valid);
		return valid;
    }

    set(i, j, val) {
        this._board[i][j] = val;
	}

	get(i, j) {
        return this._board[i][j];
    }

    iterRows() {
        return this._board;
    }

    iterCols() {
        return zip(this._board);
    }

    _getDiag(board, minSize) {
        let diags = [];
        for (let x=minSize - 1; x<(this.grid[0] + this.grid[1]) - minSize; x++) {
            let items = [];
            for (let i=0; i<x+1; i++) {
                if (i < this.grid[0] && x-i < this.grid[1]) {
					items.push(board[i][x-i]);
                }
            }
            diags.push(items);
        }
        return diags;
    }

    iterDiag1(minSize=1) {
        return this._getDiag(this._board, minSize);
    }

    iterDiag2(minSize=1) {
        let flipped = this._board.map(function (arr) {return arr.slice().reverse();});
        return this._getDiag(flipped, minSize);
    }

    copy() {
        let g = new GameBoard (...this.grid);
        g._board = this._board.map(function (arr) {return arr.slice();});
        return g;
    }
}


class Game {
    constructor() {
        this.gridSize = [3, 3];
        this.depth = 6;
        this.btns = {};
        for (let i=0; i<3; i++) {
            for (let j=0; j<3; j++) {
                let name = `${i}-${j}`;
                this.btns[name] = document.getElementById(`square-${name}`);
                this.btns[name].innerHTML = '';
            }
        }
        this.btnsRef = Object.values(this.btns);
        this.gameText = document.getElementById('game-text');
        this.goesFirst = document.getElementById('goesFirst');
        this.board = new GameBoard(...this.gridSize);
        this.timeout = null;
        this.initialize();
    }

    initialize() {
        clearTimeout(this.timeout);
        for (let btn of this.btnsRef) {
            btn.innerHTML = '';
            btn.disabled = false;
        }
        this.gameText.innerText = 'Good luck :)';
        this.board.createBoard();

        let goesFirst = this.goesFirst.value;

        if (goesFirst === 'random') {
              goesFirst = ['player', 'computer'][Math.floor(Math.random() * 2)];
        }

        if (goesFirst=== 'computer') {
            this.opponentMove();
        }
    }

    isEnd(state) {
        for (let arr of [state.iterRows(), state.iterCols(), state.iterDiag1(3), state.iterDiag2(3)]) {
            for (let a of arr) {
                if (a[0] !== 0 && a.every((val, i, arr_) => val === arr_[0]))
                    return [a[0], true];
            }
        }
        return [null, state.iterRows().every(row => row.every(val => val !== 0))]
    }

    validInputs(state) {
        return state.zeroes();
    }

    utility(state, player) {
        let result = this.isEnd(state);
        let winner = result[0];
        let end = result[1];

        if (end) {
            if (winner === null)
                return 0;
            return winner === player? 1 : -1;
        }
        return 0;
    }

    minimax(state, depth, alpha=-2, beta=2, maximizing=true) {
        if (depth === 0 || this.isEnd(state)[1])
            return [null, this.utility(state, 2)];

        let bestMove = null;
        let bestScore = maximizing ? -2 : 2;

        for (let cord of this.validInputs(state)) {
            cord = cord.split('-').map(function (c) {return parseInt(c)});
            let i = cord[0];
            let j = cord[1];

            let tState = state.copy();
            tState.set(i, j, maximizing ? 2 : 1);

            let u = this.minimax(tState, depth-1, alpha, beta, !maximizing)[1];

            if ((maximizing && u > bestScore) || (!maximizing && u < bestScore)) {
                bestMove = [i, j];
                bestScore = u;
            }

            if (maximizing && u > alpha)
                alpha = u;
            else if (!maximizing && u < beta)
                beta = u;

            if (beta <= alpha)
                break;
        }
        return [bestMove, bestScore];
    }

    checkEnd() {
        let result = this.isEnd(this.board);
        let winner = result[0];
        let end = result[1];
        if (end) {
            if (winner === 1) {
                console.log('You win!');
                this.gameText.innerText = 'You win!';
            } else if (winner === 2) {
                console.log('You lose!');
                this.gameText.innerText = 'You lose!';
            } else {
                console.log('Tie!');
                this.gameText.innerText = 'It\'s a tie..';

            }
            this.timeout = setTimeout(()=>this.initialize(), 10000);
        }
        return end;
    }

    playerMove(x, y) {
        for (let btn of this.btnsRef)
            btn.disabled = true;
        let validInputs = this.validInputs(this.board);
        let name = `${x}-${y}`;
        if (!validInputs.includes(name)) {
            for (let btn of this.btnsRef)
                btn.disabled = false;
            return;
        }
        this.board.set(x, y, 1);
        this.btns[name].innerHTML = '<i class="fas fa-times"></i>';

        if (!this.checkEnd())
            this.timeout = setTimeout(() => this.opponentMove(), 200);
    }

    opponentMove() {
        let move = this.minimax(this.board, this.depth)[0];

        this.board.set(move[0], move[1], 2);
        this.btns[`${move[0]}-${move[1]}`].innerHTML = '<i class="far fa-circle"></i>';
        if (!this.checkEnd()) {
            for (let btn of this.btnsRef)
                btn.disabled = false;
        }
    }
}
