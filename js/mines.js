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

/* IE fix */
if (typeof (console) === 'undefined') {
	console = {};
	console.log = function() {
	};
	console.group = console.groupEnd = console.log;
}

function addListener(element, event, f) {
	if (element.addEventListener) {
		element.addEventListener(event, f, false);
	} else if (element.attachEvent) {
		element.attachEvent('on' + event, f);
	}
}

function isTouchDevice(){
	return ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;
}

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
//			console.log("select cell (", row, ",", col, ")");
			var selectedCell = getCell(row, col) || {};
			if (!selectedCell.m_trapped) {
				selectedCell.m_trapped = true;
//				console.log("install bomb on cell (", row, ",", col, ")");
				visitNeighbours(selectedCell, updateBomb);
				remainingBombs--;
			} else {
//				console.log("cell (", row, ",", col, ") already bombed");
			}
		}
//		console.log("all bombs have been planted");
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
	var longPressTimeout = null, resizeTimeout = null;
	var longClick = false;
	var clickHandler, newGameHandler, installHandler;
	var gameElement = document.getElementById("game"),
		installElement = document.getElementById("install"),
		newGame = document.getElementById("newGame"),
		menuElement = document.querySelector(".menu");
	var nbCellsByRow = 8;
	var cellSize = 100;
	var MIN_CELL_SIZE = 20,
		MENU_OVERLAP = 32;
	
	function toggleMenu() {
		menuElement.classList.toggle("active");
	}
	
	function onClickMenu(e){
		var target = e.target;
		if (target == newGame) {
			newGameHandler();
			toggleMenu();
		} else if (target == installElement) {
			installHandler();
		} else {
			toggleMenu();	
		}
	}
	
	var eventType=isTouchDevice()?"touchstart":"click";
	addListener(menuElement, eventType, onClickMenu);
	
	addListener(document, "contextmenu", function(e) {
		if (e.preventDefault) {
			e.preventDefault();
		}
		return false;
	});
	addListener(gameElement, "mouseup", function(e) {
		var el = findTarget(e);
		if (!longClick && el) {
			var row = indexOf(el.parentElement);
			var col = indexOf(el);
//			console.log("cell("+ row+ ","+ col+ ") has been clicked");
			var rightClick = (e.which && e.which === 3)
					|| (e.button && e.button === 2) || longClick;
			clickHandler(row, col, rightClick);
		}

		return false;
	});
	addListener(gameElement, "touchstart", function(e) {
		longPressTimeout = setTimeout(function() {
			longClick = true;
			var el = findTarget(e);
			if (el) {
				var row = indexOf(el.parentElement);
				var col = indexOf(el);
//				console.log("cell(", row, ",", col, ") has been long clicked");
				clickHandler(row, col, true);
			}
		}, 500);
	});
	addListener(gameElement, "touchmove", function(e) {
		clearTimeout(longPressTimeout);
	});
	addListener(gameElement, "touchend", function(e) {
		longClick = false;
		clearTimeout(longPressTimeout);
	});

	addListener(window, "resize", function() {
		/* Code from MDN https://developer.mozilla.org/en-US/docs/Mozilla_event_reference/resize */
		// ignore resize events as long as an actualResizeHandler execution is
		// in the queue
		if (!resizeTimeout) {
			resizeTimeout = setTimeout(function() {
				resizeTimeout = null;
				actualResizeHandler();
				// The actualResizeHandler will execute at a rate of 15fps
			}, 66);
		}
	});

	function actualResizeHandler() {
		var newSize = computeCellSize();
		if (cellSize !== newSize && newSize > MIN_CELL_SIZE) {
			cellSize = newSize;
//			console.log("window resized, new cell size:",cellSize);
			var rowElements = document.querySelectorAll(".row");
			for ( var i = 0; i < rowElements.length; i++) {
				updateRowElementStyle(rowElements[i]);
			}
			var cellElements = document.querySelectorAll(".cell");
			for ( var i = 0; i < cellElements.length; i++) {
				updateCellElementStyle(cellElements[i]);
			}
			var tileElements = document.querySelectorAll(".cell .flip div");
			for ( var i = 0; i < tileElements.length; i++) {
				updateTileElementStyle(tileElements[i]);
			}
		}
	}

	function findTarget(e) {
		if (!e) {
			e = window.event;
		}
		var el = e.target || e.srcElement;
		while (el && el.className.indexOf("cell") === -1) {
			el = el.parentElement;
		}
		return el;
	}

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
	
	function registerNewGameHandler(handler) {
		newGameHandler = handler;
	}
	
	function registerInstallHandler(handler) {
		installHandler = handler;
	}

	function computeRowWidth() {
		var body = window.document.body;
		var winWidth = 0, winHeight = 0;
		if (window.innerWidth) {
			winWidth = window.innerWidth;
			winHeight = window.innerHeight;
		} else if (body.parentElement.clientWidth) {
			winWidth = body.parentElement.clientWidth;
			winHeight = body.parentElement.clientHeight;
		}
		return Math.min(winWidth, winHeight
				- MENU_OVERLAP *3);
	}

	function computeCellSize() {
		return Math.floor((computeRowWidth() / nbCellsByRow) - 2);
	}

	function reset(cells, rows, cols) {
		gameElement.innerHTML = '';
		nbCellsByRow = Math.max(rows, cols);
		cellSize = computeCellSize();
		for ( var i = 0; i < rows; i++) {
			var row = cells.slice(i * rows, i * rows + cols);
			gameElement.appendChild(createRow(row));
		}
	}

	function createRow(cells) {
		var row = document.createElement("div");
		row.className = "row";
		updateRowElementStyle(row);
		var length = cells.length;
		for ( var i = 0; i < length; i++) {
			row.appendChild(createCell(cells[i]));
		}
		return row;
	}
	
	function updateRowElementStyle(rowElement) {
		rowElement.style.height = cellSize + "px";
	}
	
	function updateCellElementStyle(cellElement) {
		cellElement.style.width = cellSize + "px";
		cellElement.style.height = cellSize + "px";
		cellElement.style.fontSize = Math.floor(cellSize / 2) + "px";
		cellElement.style.lineHeight = cellSize + "px";
	}
	
	function updateTileElementStyle(el) {
		el.style.height = cellSize + "px";
		el.style.width = cellSize + "px";
	}

	function createCell(cell) {
		var cellElement = document.createElement("div");
		var flipElement = document.createElement("div");
		var frontElement = document.createElement("div");
		var backElement = document.createElement("div");
		updateCellElementStyle(cellElement);
		updateTileElementStyle(frontElement);
		updateTileElementStyle(backElement);
		flipElement.appendChild(backElement);
		flipElement.appendChild(frontElement);
		flipElement.className = "flip transitionable";
		cellElement.appendChild(flipElement);
		cellElement.className = "cell";
		cellElement.setAttribute("role", "button");
		if (cell) {
			if (cell.m_bombs != 0 && !cell.m_trapped) {
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
			console.warn("cell (", i, ",", j, ") not found");
		}
	}
	
	function showInstall() {
		installElement.classList.remove("hidden");
	}
	function hideInstall() {
		installElement.classList.add("hidden");
	}

	return {
		reset : reset,
		registerClickHandler : registerClickHandler,
		registerNewGameHandler : registerNewGameHandler,
		registerInstallHandler : registerInstallHandler,
		reveal : reveal,
		toggleFlag : toggleFlag,
		showInstall : showInstall,
		hideInstall : hideInstall,
	};
})();

var controller = (function(model, view) {
	var m_model = model;
	var m_view = view;
	var m_cellRevealed = 0;
	
	function start() {
		if (window.install.type !== 'unsupported' && window.install.state !== 'installed' && window.install.type !== 'chrome') {
			console.log("application is not installed");
			m_view.showInstall();
		}
		newGame();
	}
	
	function install() {
		window.install();
	}
	window.install.addEventListener('change', function(e) {
		if (e.detail === 'installed') {
			m_view.hideInstall();
		}
	});

	function newGame() {
		var rows = 8, cols = 8, bombs = 10;
		model.reset(rows, cols, bombs);
		view.reset(model.cells(), rows, cols);
		m_cellRevealed = 0;
	}

	function onCellClick(row, col, rightOrLongClick) {
		var cell = m_model.getCell(row, col);
		if (cell) {
			if (rightOrLongClick && !cell.m_revealed) {
				m_view.toggleFlag(cell.x, cell.y);
			} else {
				if (cell.m_trapped) {
					m_view.reveal(cell.x, cell.y);
					if (confirm("Boom ! You loose! Do you want to start a new game?")) {
						newGame();
					}
				} else {
					var cellsToReveal = m_model.reveal(cell);
					var length = cellsToReveal.length;
					for ( var i = 0; i < length; i++) {
						var currentCell = cellsToReveal[i];
						m_view.reveal(currentCell.x, currentCell.y);
					}
					m_cellRevealed += length;
					if (m_model.getNbCellsForVictory() == m_cellRevealed) {
						if (confirm("You win! Do you want to start a new game?")) {
							newGame();
						}
					}
				}
			}
		} else {
			console.warn("Unable to find cell");
		}

	}
	m_view.registerClickHandler(onCellClick);
	m_view.registerNewGameHandler(newGame);
	m_view.registerInstallHandler(install);

	return {
		start : start
	};
})(model, view);

controller.start();
