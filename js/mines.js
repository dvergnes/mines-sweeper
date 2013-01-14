/*
 * mines.js: Mines sweeper web implementation
 * 
 * Copyright (C) 2013  Denis Vergnes
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *     
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var model = (function() {
	var m_bomb = 0, m_rows = 0, m_columns = 0;
	var m_cells = [];

	function isInRange(i, j) {
		return i >= 0 && i < m_columns && j >= 0 && j < m_rows;
	}

	function setCell(i, j, cell) {
		m_cells[i * m_rows + j] = cell;
	}

	function getCell(i, j) {
		return m_cells[i * m_rows + j];
	}

	function reset(rows, cols, bombs) {
		m_cells = [];
		m_rows = rows;
		m_columns = cols;
		m_bomb = bombs;
		for ( var j = 0; j < m_rows; j++) {
			for ( var i = 0; i < m_columns; i++) {
				var cell = {};
				cell.x = j;
				cell.y = i;
				cell.m_trapped = false;
				cell.m_bombs = 0;
				cell.m_revealed = false;
				setCell(j, i, cell);
			}
		}
		plantBombs();
	}

	function plantBombs() {
		var remainingBombs = m_bomb;
		var updateBomb = function(cell) {
			cell.m_bombs++;
		};
		while (remainingBombs > 0) {
			var row = Math.round(Math.random() * (m_rows - 1));
			var col = Math.round(Math.random() * (m_columns - 1));
			console.log("select cell (", row, ",", col, ")");
			var selectedCell = getCell(row, col) || {};
			if (!selectedCell.m_trapped) {
				selectedCell.m_trapped = true;
				console.log("install bomb on cell (", row, ",", col, ")");
				visitNeighbours(selectedCell, updateBomb);
				remainingBombs--;
			} else {
				console.log("cell (", row, ",", col, ") already bombed");
			}
		}
		console.log("all bombs have been planted");
	}

	function visitNeighbours(cell, f) {
		var row = cell.x;
		var col = cell.y;
		for ( var i = -1; i < 2; i++) {
			for ( var j = -1; j < 2; j++) {
				if (!(i === 0 && j === 0) && isInRange(row + i, col + j)) {
					f(getCell(row + i, col + j));
				}
			}
		}
	}

	function cells() {
		return m_cells;
	}

	function getNbCellsForVictory() {
		return m_cells.length - m_bomb;
	}

	function reveal(cell) {
		var toReveal = [];
		var queue = [];
		var pushInQueue = function(c) {
			queue.push(c);
		};
		queue.push(cell);
		while (queue.length !== 0) {
			var currentCell = queue.pop();
			if (!currentCell.m_revealed) {
				if (currentCell.m_bombs === 0) {
					visitNeighbours(currentCell, pushInQueue);
				}
				currentCell.m_revealed = true;
				toReveal.push(currentCell);
			}
		}
		return toReveal;
	}

	return {
		reset : reset,
		cells : cells,
		getCell : getCell,
		getNbCellsForVictory : getNbCellsForVictory,
		reveal : reveal
	};
})();

var view = (function() {
	var clickHandler;
	var gameElement = document.getElementById("game");

	function addEventListener(element, event, f) {
		if (element.addEventListener) {
			element.addEventListener(event, f, false);
		} else if (element.attachEvent) {
			element.attachEvent('on' + event, f);
		}
	}
	addEventListener(gameElement, "mouseup", function(e) {
		if (!e) {
			e = window.event;
		}

		var el = e.target || e.srcElement;
		while (el && el.className.indexOf("cell") === -1) {
			el = el.parentElement;
		}
		if (el) {
			var row = indexOf(el.parentElement);
			var col = indexOf(el);
			console.log("cell(", row, ",", col, ") has been clicked");
			var rightClick = (e.which && e.which === 3)
					|| (e.button && e.button === 2);
			clickHandler(row, col, rightClick);
		}

		return false;
	});
	addEventListener(document, "contextmenu", function(e) {
		if (e.preventDefault) {
			e.preventDefault();
		}
		return false;
	});

	function indexOf(node) {
		var child = node.parentElement.children;
		var length = child.length;
		for ( var i = 0; i < length; i++) {
			if (child[i] == node) {
				return i;
			}
		}
		return -1;
	}

	function registerClickHandler(handler) {
		clickHandler = handler;
	}

	function reset(cells, rows, cols) {
		gameElement.innerHTML = '';
		for ( var i = 0; i < rows; i++) {
			var row = cells.slice(i * rows, i * rows + cols);
			gameElement.appendChild(createRow(row));
		}
	}

	function createRow(cells) {
		var row = document.createElement("div");
		row.className = "row";
		var length = cells.length;
		for ( var i = 0; i < length; i++) {
			row.appendChild(createCell(cells[i]));
		}
		return row;
	}

	function createCell(cell) {
		var cellElement = document.createElement("div");
		var flipElement = document.createElement("div");
		var frontElement = document.createElement("div");
		var backElement = document.createElement("div");
		flipElement.appendChild(backElement);
		flipElement.appendChild(frontElement);
		flipElement.className = "flip";
		cellElement.appendChild(flipElement);
		cellElement.className = "cell";
		cellElement.setAttribute("role","button");
		if (cell) {
			if (cell.m_bombs != 0) {
				frontElement.innerHTML = cell.m_bombs;
			}
			frontElement.className = "front";
			if (cell.m_trapped) {
				frontElement.className += " trapped";
			}
		}
		return cellElement;
	}

	function reveal(i, j) {
		addClass(i, j, "revealed");
	}

	function toggleFlag(i, j) {
		toggleClass(i, j, "flagged");
	}

	function addClass(i, j, clazz) {
		applyClass(i, j, function(el) {
			el.classList.add(clazz);
		});
	}

	function toggleClass(i, j, clazz) {
		applyClass(i, j, function(el) {
			el.classList.toggle(clazz);
		});
	}

	function applyClass(i, j, f) {
		var rowElement = gameElement.children[i];
		if (rowElement && rowElement.children[j]) {
			f(rowElement.children[j]);
		} else {
			console.log("cell (", i, ",", j, ") not found");
		}
	}

	return {
		reset : reset,
		registerClickHandler : registerClickHandler,
		reveal : reveal,
		toggleFlag : toggleFlag
	};
})();

var controller = (function(model, view) {
	var m_model = model;
	var m_view = view;
	var m_cellRevealed = 0;

	function start() {
		var rows = 8, cols = 8, bombs = 10;
		model.reset(rows, cols, bombs);
		view.reset(model.cells(), rows, cols);
	}

	function onclick(row, col, right) {
		var cell = m_model.getCell(row, col);
		if (cell) {
			if (right && !cell.m_revealed) {
				m_view.toggleFlag(cell.x, cell.y);
			} else {
				if (cell.m_trapped) {
					alert("Boom ! You loose!");
				} else {
					var cellsToReveal = m_model.reveal(cell);
					var length = cellsToReveal.length;
					for ( var i = 0; i < length; i++) {
						var currentCell = cellsToReveal[i];
						m_view.reveal(currentCell.x, currentCell.y);
					}
					m_cellRevealed += length;
					if (m_model.getNbCellsForVictory() == m_cellRevealed) {
						alert("You win!");
					}
				}
			}
		} else {
			console.log("Unable to find cell");
		}

	}
	m_view.registerClickHandler(onclick);

	return {
		start : start,
		onclick : onclick
	};
})(model, view);
controller.start();