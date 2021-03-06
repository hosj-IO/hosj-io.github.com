/**
 * Created by Sjoerd Houben on 09-Nov-15.
 */
// app.js
// =============================================================================
var app = angular.module('formApp', ['ngAnimate', 'ui.router', 'ui.bootstrap'])

    // =============================================================================
    //region Config
    .config(function ($stateProvider, $urlRouterProvider) {

        $stateProvider

            .state('form', {
                url: '/form',
                templateUrl: 'form.html',
                controller: 'formController'
            })

            .state('form.playerCount', {
                url: '/playerCount',
                templateUrl: 'form-playerCount.html'
            })

            .state('form.expansions', {
                url: '/expansions',
                templateUrl: 'form-expansions.html'
            })

            .state('form.ban', {
                url: '/ban',
                templateUrl: 'form-ban.html'
            })
            .state('form.result', {
                url: '/result',
                templateUrl: 'form-result.html'
            })
        ;

        $urlRouterProvider.otherwise('/form/playerCount');
    })
    //endregion
    //region Filter
    .filter('range', function () {
        return function (input, total) {
            total = parseInt(total);

            for (var i = 1; i < total; i++) {
                input.push(i);
            }

            return input;
        };
    })
    //endregion
    // =============================================================================
    //region Controller
    .controller('formController', function ($scope, $http, $location, $window) {


            //region Variables
            $scope.isDisabled = true;
            $scope.started = true;


            $scope.Banned = [];
            $scope.ColLimit = 5;

            $scope.MinimumCivs = 0;
            $scope.SelectableCivs = 0;
            $scope.SelectedCivsCount = 0;

            $scope.MaxBannable = 0;
            $scope.CurrentlyBanned = 0;

            $scope.showAlert = false;


            $scope.formData = {};

            $scope.BannedCivs = [];

            $scope.formData.selectedExpansions = [];

            $scope.game = 6;
            //endregion

            //region Getters JSON
            $http.get('expansions.'+ $scope.game +'.json')
                .then(function (res) {
                    $scope.expansions = res.data;
                });

            $http.get('civs.'+ $scope.game +'.json')
                .then(function (res) {
                    $scope.civs = res.data;
                    $scope.preprocessedCivs = $scope.civs.civilizations;
                });
            //endregion

            //region Switch civs
            $scope.Switch = function () {
                if($scope.game ==6){
                    $scope.game = 5;
                }else if ($scope.game == 5){
                    $scope.game = 6;
                }
            }


            //region PlayerCountLogic
            $scope.PlayerCountLogic = function () {
                if ($scope.formData.selectedExpansions.length == 0) {
                    $scope.formData.selectedExpansions = new Array($scope.expansions.expansion.length);
                }
                for (var i = 0; i < $scope.formData.selectedExpansions.length; i++) {
                    $scope.formData.selectedExpansions[i] = true;
                }
                $scope.MinimumCivs = $scope.formData.playerCount * $scope.formData.countCiv;
                $scope.SelectableCivs = $scope.preprocessedCivs.length;
                $scope.SelectedCivsCount = $scope.SelectableCivs;
                $scope.MaxBannable = $scope.SelectableCivs - $scope.MinimumCivs;
            }
            //endregion

            //region ExpansionLogic
            $scope.UpdateCount = function (name, index) {
                var civsInExpansion = GetCivCountFromExpasion(name);
                if (civsInExpansion == 0)
                    throw "0 civilization in expansion. This is of course impossible";
                var expansionState = $scope.formData.selectedExpansions[index];

                if (expansionState) {
                    $scope.SelectedCivsCount = $scope.SelectedCivsCount + civsInExpansion;
                    $scope.CurrentlyBanned = $scope.CurrentlyBanned - civsInExpansion;
                    if ($scope.CurrentlyBanned == $scope.MaxBannable) {
                        $scope.BannedType = "warning";
                        $scope.showAlert = true;
                    } else {
                        $scope.BannedType = "info"
                        $scope.showAlert = false;
                    }
                } else {

                    var difference = $scope.SelectedCivsCount - civsInExpansion;
                    if (difference < $scope.MinimumCivs) {
                        $scope.formData.selectedExpansions[index] = !expansionState;
                        //TODO: Add popup message
                    } else {
                        $scope.SelectedCivsCount = $scope.SelectedCivsCount - civsInExpansion;
                        $scope.CurrentlyBanned = $scope.CurrentlyBanned + civsInExpansion;
                        if ($scope.CurrentlyBanned == $scope.MaxBannable) {
                            $scope.BannedType = "warning";
                            $scope.showAlert = true;
                        } else {
                            $scope.BannedType = "info"
                            $scope.showAlert = false;
                        }
                    }
                }
            }

            $scope.SelectOrUnselectExpansions = function (isSelect) {
                if ($scope.formData.selectedExpansions.length == 0) {
                    $scope.formData.selectedExpansions = new Array($scope.expansions.expansion.length);
                }
                for (var i = 0; i < $scope.formData.selectedExpansions.length; i++) {
                    //if the state is changed
                    $scope.formData.selectedExpansions[i] = isSelect;
                }
                $scope.CurrentlyBanned = 0;
                $scope.BannedType = "info"
                var test = 0;
            }

            $scope.ExpansionLogic = function () {
                var selectedExpansion = [];
                for (var i = 0; i < $scope.formData.selectedExpansions.length; i++) {
                    if ($scope.formData.selectedExpansions[i] == true) {
                        selectedExpansion.push($scope.expansions.expansion[i]);
                    }
                }

                var civIndex = $scope.preprocessedCivs.length;

                while (civIndex--) {
                    var isNotBanned = false;
                    var civ = $scope.preprocessedCivs[civIndex];
                    for (var j = 0; j < selectedExpansion.length; j++) {
                        var expansion = selectedExpansion[j];

                        for (var k = 0; k < civ.expansion.length; k++) {
                            var civExpansion = civ.expansion[k]
                            if (civExpansion != expansion) {
                                if (j == selectedExpansion.length - 1) {
                                    $scope.preprocessedCivs.splice(civIndex, 1);
                                }
                            } else {
                                isNotBanned = true;
                                break;
                            }
                        }
                        if (isNotBanned)
                            break;
                    }
                }
                $scope.processedCivs = processCivs($scope.preprocessedCivs, 5);
            }

            //endregion

//region BanCivLogic
            $scope.AddOrRemoveFromBanArray = function (civName, index) {
                if ($scope.BannedCivs.length === 0) {
                    var newCount = $scope.SelectedCivsCount - 1;
                    if (newCount >= $scope.MinimumCivs) {
                        $scope.BannedCivs.push(civName);
                        $scope.Banned[index] = true;
                        $scope.SelectedCivsCount = newCount;
                        $scope.CurrentlyBanned = $scope.CurrentlyBanned + 1;
                        if ($scope.CurrentlyBanned == $scope.MaxBannable) {
                            $scope.BannedType = "warning";
                            $scope.showAlert = true;
                        } else {
                            $scope.BannedType = "info"
                            $scope.showAlert = false;
                        }
                    } else {
                        $scope.showAlert = true;
                    }
                } else {

                    for (var i = 0; i < $scope.BannedCivs.length; i++) {
                        if ($scope.BannedCivs[i] === civName) {
                            $scope.BannedCivs.splice(i, 1);
                            $scope.Banned[index] = false;
                            $scope.SelectedCivsCount = $scope.SelectedCivsCount + 1;
                            $scope.CurrentlyBanned = $scope.CurrentlyBanned - 1;
                            if ($scope.CurrentlyBanned == $scope.MaxBannable) {
                                $scope.BannedType = "warning";
                                $scope.showAlert = true;
                            } else {
                                $scope.BannedType = "info"
                                $scope.showAlert = false;
                            }
                            return;
                        }
                    }
                    var newCount = $scope.SelectedCivsCount - 1;
                    if (newCount >= $scope.MinimumCivs) {
                        $scope.BannedCivs.push(civName);
                        $scope.Banned[index] = true;
                        $scope.SelectedCivsCount = newCount;
                        $scope.CurrentlyBanned = $scope.CurrentlyBanned + 1;
                        if ($scope.CurrentlyBanned == $scope.MaxBannable) {
                            $scope.BannedType = "warning";
                            $scope.showAlert = true;
                        } else {
                            $scope.BannedType = "info"
                            $scope.showAlert = false;
                        }
                    } else {
                        $scope.showAlert = true;
                    }


                }
            };

            $scope.ResetBanned = function () {
                var bannedLength = $scope.BannedCivs.length;
                $scope.CurrentlyBanned = $scope.CurrentlyBanned - bannedLength;
                if ($scope.CurrentlyBanned == $scope.MaxBannable) {
                    $scope.BannedType = "warning";
                } else {
                    $scope.BannedType = "info"
                }
                $scope.BannedCivs = [];
                $scope.Banned = [];
            }

            $scope.Calculate = function () {
                if ($scope.formData.playerCount > 0 && $scope.formData.countCiv > 0) {
                    var selectedCivs = [];
                    $scope.formData.result = [];
                    $scope.civsWithoutBans = $scope.preprocessedCivs;

                    for (var i = 0; i < $scope.BannedCivs.length; i++) {
                        for (var j = 0; j < $scope.civsWithoutBans.length; j++) {
                            if ($scope.BannedCivs[i] === $scope.civsWithoutBans[j].nationName) {
                                $scope.civsWithoutBans.splice(j, 1);
                            }
                        }
                    }


                    for (var i = 0; i < $scope.formData.playerCount; i++) {
                        var playerObject = {};
                        playerObject.Name = "Player " + (i + 1);
                        playerObject.civs = [];
                        for (var j = 0; j < $scope.formData.countCiv; j++) {
                            var existsInArray = false;
                            do {
                                var randomNumber = Math.floor((Math.random() * $scope.civsWithoutBans.length))
                                var selectedCiv = $scope.civsWithoutBans[randomNumber];
                                for (var k = 0; k < selectedCivs.length; k++) {
                                    if (selectedCiv.nationName === selectedCivs[k].nationName) {
                                        existsInArray = true;
                                        break;
                                    } else {
                                        existsInArray = false;
                                    }
                                }

                            } while (existsInArray)
                            playerObject.civs[j] = selectedCiv;
                            selectedCivs.push(selectedCiv);
                        }
                        $scope.formData.result.push(playerObject);
                    }
                }
            }
//endregion

//region Reset
            $scope.Reset = function () {
                $location.path('index.html#/form/playerCount');
                //$window.location.reload();
            }
//endregion

//region Private Functions
            function processCivs(array, size) {
                var newArray = [];
                var l = array.length;
                for (var i = 0; i < array.length; i += size) {
                    newArray.push(array.slice(i, i + size));
                }
                return newArray;
            };

            function GetCivCountFromExpasion(name) {
                var count = 0;
                for (var i = 0; i < $scope.preprocessedCivs.length; i++) {
                    if ($scope.preprocessedCivs[i].expansion == name) {
                        count++;
                    }
                }
                return count;

            }

            function ShouldCivBeBannedWithMultipleDLC(civ, bannedExpansionList) {
                var countBannedCounter = 0;
                for (var i = 0; i < civ.expansion.length; i++) {
                    var expansion = civ.expansion.l[i];
                    for (var j = 0; j < bannedExpansionList.length; j++) {
                        var bannedExpansion = bannedExpansionList[j];
                        if (expansion == bannedExpansion) {
                            countBannedCounter++;
                        }
                    }

                }
                if (countBannedCounter == civ.expansion - 1 && countBannedCounter == civ.expansion) {
                    return true;
                } else {
                    return false;
                }
            }

//endregion
        }
//endregion
    )
    ;