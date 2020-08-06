class TimeCalcs {

    //validate datetime with regex: ([0-9]{4}[-][0-9]{2}[-][0-9]{2}[T][0-9]{2}[:][0-9]{2}[:][0-9]{2}[.](000Z))

    // accepts: d - date
    //          useOffset - if we want to use israel's timezone
    // returns: datetime with format to post to database
    static getTimezoneDatetime(d = Date.now(), useOffset = true, timezone = "Asia/Jerusalem") {
        // from this format -> 2/7/2020, 9:46:11
        // to this format   -> 2020-02-07T09:37:36.000Z
        if (!useOffset) { return new Date(d); }
        let now = new Date(d).toLocaleString("en-US", { timeZone: timezone, hour12: false });
        let nowArr = now.split(", ");
        let dateArr = nowArr[0].split("/");
        if (!dateArr || !dateArr.length || !dateArr[0] || !dateArr[0].length || !dateArr[1] || !dateArr[1].length)
            return null;
        let month = dateArr[0].length === 2 ? dateArr[0] : "0" + dateArr[0];
        let day = dateArr[1].length === 2 ? dateArr[1] : "0" + dateArr[1];
        let date = dateArr[2] + "-" + month + "-" + day;
        let time = nowArr[1];
        let datetime = date + "T" + time + ".000Z";
        datetime = new Date(datetime);
        return datetime;
    }

    /*** 
    Whats the difference? 
        let's assume that now is  2/7/2020, 9:46:11. 


        getTimezoneDateString returns the string that looks just alike the hour now- but when you try to get the hour, its not valid.
        for example, new Date(2020-02-07T09:37:36.000Z).getHours() is 12

        getTimezoneValidDate will give you the wrong string, but the valid date- 
        So when the date string looks like 2020-02-07T06:37:36.000Z the hour would be 9.

        
    ***/

    static getTimezoneDateString(d = Date.now(), useOffset = true, timezone = "Asia/Jerusalem") {
        return this.getTimezoneDatetime(d, useOffset, timezone);
    }

    static getTimezoneValidDate(d = Date.now(), useOffset = true, timezone = "Asia/Jerusalem") {
        let now = new Date(d).toLocaleString("en-US", { timeZone: timezone });
        return new Date(now);
    }
}

module.exports = TimeCalcs;
