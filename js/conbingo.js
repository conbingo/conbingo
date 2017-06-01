window.conbingo = new (function() {
    // Stores loaded items.
    var items = [];
    var freeItems = [];

    // Stores the board.
    var board = [];

    // HTML templates
    var rowTemplate =
        _.template(document.getElementById("bingo-row-template").innerHTML);
    var itemTemplate =
        _.template(document.getElementById("bingo-item-template").innerHTML);

    // Initialize board to a default 5x5 grid.
    for (var i = 0; i < 5; i++) {
        var row = [];

        for (var j = 0; j < 5; j++) {
            var col = {
                text: "",
                marked: false,
            };

            row.push(col)
        }

        board.push(row);
    }

    // easy GET request method.
    function GET(url, callback) {
        var req = new XMLHttpRequest();

        req.responseType = "json";

        req.onreadystatechange = function() {
            if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
                callback(req.response);
            }
        };

        req.open("GET", url, true);
        req.send();
    }

    // Load an item set from one of the JSON files.
    function loadItemSet(name, callback) {
        var url = "js/" + name + ".json";
        console.log("Loading \"" + name + "\" item set");
        GET(url, callback);
    }

    // Load a list of item sets, then call callback once they are all loaded
    // Also loads the free space set.
    function loadItemSets(sets, callback) {
        var numCalls = sets.length + 1;

        var waitCallback = _.after(numCalls, callback);

        function loadCallback(set) {
            items = items.concat(set);
            waitCallback();
        }

        function loadFreeCallback(set) {
            freeItems = set;
            waitCallback();
        }

        _.each(sets, function(set) {
            loadItemSet(set, loadCallback);
        });

        loadItemSet("free", loadFreeCallback);
    }

    // generate a new board
    function generateBoard() {
        var chosenItems = _.sample(items, 24);

        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 5; j++) {

                // skip the free space
                if (i == 2 && j == 2)
                    continue;

                var thisItem = chosenItems.shift();
                board[i][j].text = thisItem;
                board[i][j].marked = false;
            }
        }

        var chosenFree = _.sample(freeItems, 1);

        board[2][2].text = chosenFree;
        board[2][2].marked = false;

        console.log("Generated new board");
    }

    // save the board to local storage
    function saveBoard() {
        var obj = {
            board: board
        };

        var objStr = JSON.stringify(obj);

        window.localStorage.conbingo = objStr;
    }

    // load the board from local storage
    function loadBoard() {
        if (!window.localStorage || !window.localStorage.conbingo)
            return false; // no stored board

        var obj = JSON.parse(window.localStorage.conbingo);

        for (var i = 0; i < 5; i++) {
            for (var j = 0; j < 5; j++) {
                board[i][j].text = obj.board[i][j].text;
                board[i][j].marked = obj.board[i][j].marked;
            }
        }

        console.log("Loaded board from localStorage");

        return true;
    }

    function rowHasBingo(rowId) {
        for (var i = 0; i < 5; i++) {
            if (board[rowId][i].marked == false)
                return false;
        }

        return true;
    }

    function colHasBingo(colId) {
        for (var i = 0; i < 5; i++) {
            if (board[i][colId].marked == false)
                return false;
        }

        return true;
    }

    function diag1HasBingo() {
        for (var i = 0; i < 5; i++) {
            if (board[i][i].marked == false)
                return false;
        }

        return true;
    }

    function diag2HasBingo() {
        for (var i = 0; i < 5; i++) {
            if (board[4 - i][i].marked == false)
                return false;
        }

        return true;
    }

    // render the board
    function renderBoard() {
        var boardHtml = "";

        var diag1Bingo = diag1HasBingo();
        var diag2Bingo = diag2HasBingo();
        var rowBingos = [];
        var colBingos = [];

        for (var i = 0; i < 5; i++) {
            if (rowHasBingo(i)) {
                rowBingos.push(true);
            } else {
                rowBingos.push(false);
            }

            if (colHasBingo(i)) {
                colBingos.push(true);
            } else {
                colBingos.push(false);
            }
        }

        for (var i = 0; i < 5; i++) {
            var colsHtml = "";

            for (var j = 0; j < 5; j++) {
                var diag1BingoItem = false;
                var diag2BingoItem = false;

                if (i == j && diag1Bingo) {
                    diag1BingoItem = true;
                }

                if ((4 - i) == j && diag2Bingo) {
                    diag2BingoItem = true;
                }

                colsHtml += itemTemplate({
                    rowId: i,
                    colId: j,
                    rowBingo: rowBingos[i],
                    colBingo: colBingos[j],
                    diag1Bingo: diag1BingoItem,
                    diag2Bingo: diag2BingoItem,
                    text: board[i][j].text,
                    marked: board[i][j].marked
                });
            }

            boardHtml += rowTemplate({
                columns: colsHtml
            });
        }

        _.each(document.getElementsByClassName("bingo-body"), function(e) {
            e.innerHTML = boardHtml;
        });
    }

    function boardClick(e) {
        var rowId = parseInt(e.getAttribute("data-row"));
        var colId = parseInt(e.getAttribute("data-col"));
        var parentEl;

        // hacky since can't just re-render; otherwise no animations
        if (e.tagName == "SPAN") {
            parentEl = e.parentNode.parentNode;
        }
        else {
            parentEl = e.parentNode;
        }

        if (board[rowId][colId].marked) {
            board[rowId][colId].marked = false;
            parentEl.setAttribute("data-marked", "false");
        } else {
            board[rowId][colId].marked = true;
            parentEl.setAttribute("data-marked", "true");
        }

        // bingo hack
        var els = document.getElementsByClassName("bingo-item-outer");

        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            parentEl = el.parentNode;
            var rowId = parseInt(el.getAttribute("data-row"));
            var colId = parseInt(el.getAttribute("data-col"));

            if (rowHasBingo(rowId)) {
                parentEl.setAttribute("data-row-bingo", "true");
            } else {
                parentEl.setAttribute("data-row-bingo", "false");
            }

            if (colHasBingo(colId)) {
                parentEl.setAttribute("data-col-bingo", "true");
            } else {
                parentEl.setAttribute("data-col-bingo", "false");
            }

            if (rowId == colId && diag1HasBingo()) {
                parentEl.setAttribute("data-diag1-bingo", "true");
            } else {
                parentEl.setAttribute("data-diag1-bingo", "false");
            }

            if (rowId == 4 - colId && diag2HasBingo()) {
                parentEl.setAttribute("data-diag2-bingo", "true");
            } else {
                parentEl.setAttribute("data-diag2-bingo", "false");
            }

        }

        //renderBoard();
        saveBoard();
    }

    this.loadBingo = function(sets) {
        if (!loadBoard()) {
            loadItemSets(sets, function() {
                generateBoard();
                saveBoard();
                renderBoard();
                console.log("Rendered new board");
            });
        } else {
            renderBoard();
            console.log("Rendered saved board");
        }
    };

    document.addEventListener("click", function(e) {
        if (_.contains(e.target.classList, "bingo-item")) {
            boardClick(e.target);
        }
    });

})();
