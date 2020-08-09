'use strict';

module.exports = function (Games) {

    Games.geteowaccordingtoIdandsubset = function (idtofind) {
        let allMyGames = Games.find();
        let allmygamessorted = [];
        let allids = allmygamessorted.map(item => item.id);
        allids = sort(allids)
        allids.forEach(id => {
            allmygamessorted.push(allMyGames.find(item => item.id == id))
        })
        return allmygamessorted;
    }

    function sort(arr) {
        let flag = true, temo = {};
        for (let j = 0; j < arr.length; j++) {
            flag = true;
            for (let i = 0; i < arr.length - 1; i++) {
                if (arr[i] > arr[i + 1]) {
                    temo[i] = arr[i]
                    arr[i] = arr[i + 1]
                    arr[i + 1] = temo[i];
                    flag = false
                }
            }
            if (flag) return arr;
        }
    }

}