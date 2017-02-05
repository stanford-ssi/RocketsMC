'use strict';

app.controller('rawDownlinkController', ['$scope', '$rootScope', '$location', '$resource', '$http',
  function ($scope, $rootScope, $location, $resource, $http) {
    /*
     * Controls the login view whcih allows users to sign up
     * or login to existing accounts. Currently just lets users
     * select their permission level with no check.
     */
     console.log($scope.main.downlinkStream);
  }]);
