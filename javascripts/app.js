var myApp = angular.module('mazeGame', ['ngMaterial', 'ui.router'])

.config(
  ['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {

        $urlRouterProvider.otherwise('/');

        $stateProvider
            .state('home', {
                url: '/',
                templateUrl: 'pages/home.html',
                controller: 'boardCtrl'
            })
            .state('gameover', {
                url: '/gameover',
                templateUrl: 'pages/gameover.html',
                controller: 'gameoverCtrl'
            })
            .state('settings', {
                url: '/settings',
                templateUrl: 'pages/settings.html',
                controller: 'settingsCtrl'
            })
  }]);

myApp.controller('sideBarCtrl', ['$scope', 'globalService', function ($scope, globalService) {

    $scope.gameButtonsEnable = globalService.gameButtonsEnable;
    $scope.placeStartTile = globalService.placeStartAction;
    $scope.placeEndTile = globalService.placeEndAction;
    $scope.go = globalService.go;
    $scope.goToSettings = globalService.goToSettings;
}])

myApp.controller('boardCtrl', ['$scope', 'globalService', function ($scope, globalService) {

    $scope.board = globalService.board;
    $scope.toggleTile = globalService.toggleTile;
}])

myApp.controller('gameoverCtrl', ['$scope', 'globalService', function ($scope, globalService) {

    var backBtnBGColors = {
        wrap: {
            regular: '#D7D7DB',
            hover: '#252525'
        },
        img: {
            regular: '#4FA868',
            hover: '#BD2746'
        }
    }
    $scope.backBtnWrapStyle = {
        'background-color': backBtnBGColors.wrap.regular
    }
    $scope.backBtnImgStyle = {
        'background-color': backBtnBGColors.img.regular
    }
    $scope.inverseBackBtn = function () {
        $scope.backBtnWrapStyle["background-color"] = backBtnBGColors.wrap.hover;
        $scope.backBtnImgStyle["background-color"] = backBtnBGColors.img.hover;
    }
    $scope.restoreBackBtn = function () {
        $scope.backBtnWrapStyle["background-color"] = backBtnBGColors.wrap.regular;
        $scope.backBtnImgStyle["background-color"] = backBtnBGColors.img.regular;
    }
    
    $scope.result = globalService.getGameResults();
    $scope.startOver = globalService.startOver;

}])

myApp.controller('settingsCtrl', ['$scope', 'globalService', function ($scope, globalService) {

    $scope.colors = globalService.tileColors;
    $scope.hexColorRegex = '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$';
    $scope.save = globalService.startOver;
}])


myApp.factory('globalService', ['$interval', '$state', function ($interval, $state) {

    var BOARD_SIZE = 12;
    var gameStates = {
        REGULAR_MODE: 0,
        PLACE_START_TILE: 1,
        PLACE_END_TILE: 2
    }
    var gameButtonsEnable = {
        start: true,
        end: true,
        go: true
    }
    var startTileLocation = null;
    var endTileLocation = null;
    var gameState = gameStates.REGULAR_MODE;
    var board = [];
    var gameResults = {
        steps: 0,
        duration: 0,
        formattedDuration: function () {
            var milliseconds = Math.round((this.duration % 1000) / 10),
                seconds = Math.floor(this.duration / 1000) % 60,
                minutes = Math.floor(this.duration / (1000 * 60))

            minutes = (minutes < 10) ? "0" + minutes : minutes;
            seconds = (seconds < 10) ? "0" + seconds : seconds;
            milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds;

            return minutes + ":" + seconds + ":" + milliseconds;
        }
    };
    var tileColors = {
        A: '#4CAF50',
        B: '#FF4081',
        C: '#69F0AE'
    }

    //Buttons
    var placeStartAction = function () {
        if (gameState === gameStates.PLACE_END_TILE)
            gameButtonsEnable.end = true;
        gameButtonsEnable.start = false;
        gameState = gameStates.PLACE_START_TILE;

    }
    var placeEndAction = function () {
        if (gameState === gameStates.PLACE_START_TILE)
            gameButtonsEnable.start = true;
        gameButtonsEnable.end = false;
        gameState = gameStates.PLACE_END_TILE;

    }
    var go = function () {
        if (startTileLocation === null || endTileLocation === null) return;
        gameButtonsEnable.go = false;
        var data = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            data[i] = [];

            for (let j = 0; j < BOARD_SIZE; j++)
                data[i][j] = board[BOARD_SIZE * i + j].checked ? 0 : 1;
        }

        var graph = new Graph(data);
        var start = graph.grid[Math.floor(startTileLocation / BOARD_SIZE)][startTileLocation % BOARD_SIZE];
        var end = graph.grid[Math.floor(endTileLocation / BOARD_SIZE)][endTileLocation % BOARD_SIZE];
        var result = astar.search(graph, start, end);

        if (result.length === 0) {
            window.alert('No Route :(');
            initNewGame();
            return;
        }
        gameResults.steps = result.length;

        var t0 = performance.now();
        var routeAnimatePromise = $interval(() => {
            let node = result.shift();
            let tile = board[BOARD_SIZE * node.x + node.y];;
            tile.style['background-color'] = tileColors.C;
        }, 100, result.length);

        routeAnimatePromise
            .then(() => {
                var t1 = performance.now();
                gameResults.duration = t1 - t0;
                $state.go('gameover')
            })
            .catch((err) => console.log('**err** = ' + err));
    }

    var toggleTile = function (tile) {
        switch (gameState) {
            case gameStates.PLACE_START_TILE:
                if (!tile.checked && !tile.end) {
                    tile.start = true;
                    gameState = gameStates.REGULAR_MODE;
                    startTileLocation = tile.id;
                }
                break;
            case gameStates.PLACE_END_TILE:
                if (!tile.checked && !tile.start) {
                    tile.end = true;
                    gameState = gameStates.REGULAR_MODE;
                    endTileLocation = tile.id;
                }
                break;
            case gameStates.REGULAR_MODE:
                if (tile.start) {
                    tile.start = false;
                    startTileLocation = null;
                    gameButtonsEnable.start = true;
                } else if (tile.end) {
                    tile.end = false;
                    endTileLocation = null;
                    gameButtonsEnable.end = true;
                } else {
                    tile.style['background-color'] = tile.style['background-color'] === tileColors.B ? tileColors.A : tileColors.B;
                    tile.checked = !tile.checked;
                }
                break;
        }
    }

    var initBoard = function () {
        //Tile Object Ctor
        function Tile(id) {
            this.id = id;
            this.checked = false;
            this.start = false;
            this.end = false;
            this.style = {
                'background-color': tileColors.A
            };
        }

        for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++)
            board.push(new Tile(i));
    }

    var initNewGame = function () {

        gameState = gameStates.REGULAR_MODE;
        gameResults.steps = 0;
        gameResults.duration = 0;

        gameButtonsEnable.start = true;
        gameButtonsEnable.end = true;
        gameButtonsEnable.go = true;

        startTileLocation = null;
        endTileLocation = null;

        board.forEach((tile) => {
            tile.checked = false;
            tile.start = false;
            tile.end = false;
            tile.style['background-color'] = tileColors.A;
        })
    }

    var getGameResults = function () {
        return gameResults;
    }

    var startOver = function () {
        initNewGame();
        $state.go('home');
    }

    var goToSettings = function () {
        $state.go('settings');
    }

    initBoard();

    return {
        board: board,
        toggleTile: toggleTile,
        placeStartAction: placeStartAction,
        placeEndAction: placeEndAction,
        go: go,
        gameStates: gameStates,
        gameState: gameState,
        gameButtonsEnable: gameButtonsEnable,
        getGameResults: getGameResults,
        startOver: startOver,
        goToSettings: goToSettings,
        tileColors: tileColors
    };
}])
