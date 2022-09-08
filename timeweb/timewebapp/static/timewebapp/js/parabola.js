/* 
The red line for all of the assignments follow a parabola
The first part of the setParabolaValues() function calculates the a and b values, and the second part handles the minimum work time and return cutoffs
this.funct(n) returns the output of an^2 + bn (with no c variable because it is translated to go through the origin)
set_mod_days() helps integrate break days into the schedule 
*/
Assignment.prototype.setParabolaValues = function () {
    /*
    The purpose of this function is to calculate these seven variables:
    a
    b
    cutoff_transition_value
    cutoff_to_use_round
    return_y_cutoff
    return_0_cutoff


    This part calculates a, b, and skew_ratio

    Three points are defined, one of which is (0,0), to generate a and b variables such that the parabola passes through all three of them
    This works because there is a parabola that exists that passes through any three chosen points (with different x coordinates)
    Notice how the parabola passes through the origin, meaning it does not use a c variable
    If the start of the line is moved and doesn't pass through (0,0) anymore, translate the parabola back to the origin instead of using a c variable
    Once the a and b variables are calculated, the assignment is retranslated accordingly

    The second point is (x1,y1), where x1 is the amount of days and y1 is the amount of units

    If set skew ratio is enabled, the third point is (x2,y2). skew_ratio will also be redefined
    If set skew ratio isn't enabled, the third point is now (1,y1/x1 * skew_ratio)
    Here, a straight line is connected from (0,0) and (x1,y1) and then the output of f(1) of that straight line is multiplied by the skew ratio to get the y-coordinate of the first point

    This is the only way I could think of storing a third point in a similar manner, as any other form will make the default curvature inconsistent
    */
    // Define (x1, y1) and translate both variables to (0,0)
    let x1 = this.sa.complete_x - this.red_line_start_x,
        y1 = this.sa.y - this.red_line_start_y;

    const mods = this.calcModDays();
    x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
    if (this.sa.break_days.includes(this.assign_day_of_week + Math.floor(this.sa.complete_x))) {
        x1 = Math.ceil(x1);
    }

    const parabola = this.calcAandBfromOriginAndTwoPoints([1, y1 / x1 * this.sa.skew_ratio], [x1, y1]);
    this.a = parabola.a;
    this.b = parabola.b;

    if (!Number.isFinite(this.a)) {
        // If there was a zero division somewhere, where x2 === 1 or something else happened, make a line with the slope of y1
        this.a = 0;
        this.b = y1;
        this.cutoff_transition_value = 0;
        // Don't define cutoff_to_use_round because it will never be used if a = 0 and b = y1
        this.return_y_cutoff = x1 ? 1 : 0;
        this.return_0_cutoff = 0;
        return;
    }
    // funct_y and funct_zero may not always be accurate in that -b/a and y1 may not be the actual funct_zero and funct_y
    // Trying to make these more accurate would require knowing whether funct rounds to min_work_time_funct_round or funct_round at -b/a and y1
    // TODO: It probably is possible to avoid a deadlock
    if (this.a <= 0 || this.b > 0) {
        var funct_zero = 0;
    } else {
        var funct_zero = mathUtils.precisionRound(-this.b / this.a, 10)
    }
    if (this.a >= 0) {
        var funct_y = x1;
    } else {
        var funct_y = mathUtils.precisionRound((Math.sqrt(this.b * this.b + 4 * this.a * y1) - this.b) / this.a / 2, 10);
    }
    if (this.sa.funct_round < this.sa.min_work_time) {
        this.cutoff_transition_value = 0;
        if (this.a) {
            // - 1e-10 to ensure cutoff_to_use_round isn't exactly an integer, at that makes output and prev_output the same and to ensure other < and > checks work
            this.cutoff_to_use_round = mathUtils.precisionRound((this.min_work_time_funct_round - this.b) / this.a / 2, 10) - 1e-10;
            // Condition needs to be here or else the entire graph may unintentionally translated this.cutoff_transition_value units
            if (funct_zero < this.cutoff_to_use_round && this.cutoff_to_use_round < funct_y) {
                const prev_output = mathUtils.clamp(0, this.funct(Math.floor(this.cutoff_to_use_round), { translateX: false }), this.sa.y);
                const output = mathUtils.clamp(0, this.funct(Math.ceil(this.cutoff_to_use_round), { translateX: false }), this.sa.y);
                if (output - prev_output) {
                    this.cutoff_transition_value = this.min_work_time_funct_round - (output - prev_output);
                }
            }
        }
    }
    if (SETTINGS.loosely_enforce_minimum_work_times && this.sa.min_work_time) {
        var y_value_to_cutoff = y1;
    } else if (this.sa.funct_round < this.sa.min_work_time && (!this.a && this.b < this.min_work_time_funct_round || this.a && (this.a > 0) === (funct_y < this.cutoff_to_use_round))) {
        var y_value_to_cutoff = y1 - this.min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = y1 - this.min_work_time_funct_round + this.sa.funct_round / 2;
    }
    if (y_value_to_cutoff > 0 && this.sa.y > this.red_line_start_y && (this.a || this.b)) {
        if (this.a) {
            this.return_y_cutoff = (Math.sqrt(this.b * this.b + 4 * this.a * y_value_to_cutoff) - this.b) / this.a / 2;
        } else {
            this.return_y_cutoff = y_value_to_cutoff / this.b;
        }
        this.return_y_cutoff = mathUtils.precisionRound(this.return_y_cutoff, 10);
    } else {
        this.return_y_cutoff = 1;
    }
    let output;
    let left;
    let right;

    left = 0;
    right = Math.ceil(this.return_y_cutoff);
    // TODO: https://github.com/ArhanChaudhary/TimeWeb/issues/5
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);

        output = this.funct(mid, { translateX: false });
        // It's possible for this.sa.y - this.min_work_time_funct_round to be less than 0
        // So when Math.ceil(this.return_y_cutoff) is 1, mid is 0, and output is also 0
        // But in the case this.sa.y - this.min_work_time_funct_round is less than 0, right will become mid and left will stay at 0, causing the assignment to instantly complete itself
        // To fix this, add Math.max(0, ...)

        // I've gone through every other binary search used in the cuttoff and this one is the only one that seems to have this issue
        if (output <= mathUtils.precisionRound(Math.max(this.red_line_start_y, this.sa.y - this.min_work_time_funct_round), 10)) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    this.return_y_cutoff = left;
    output = this.funct(this.return_y_cutoff - 1, { translateX: false });


    if (SETTINGS.loosely_enforce_minimum_work_times && this.sa.min_work_time) {
        const lower_return_y_cutoff = this.return_y_cutoff;
        const lower_output_diff = this.sa.y - output;

        left = lower_return_y_cutoff;
        right = x1;
        while (left < right) {
            const mid = left + Math.floor((right - left) / 2);

            output = this.funct(mid, { translateX: false });
            if (output < this.sa.y) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        this.return_y_cutoff = left;
        output = this.funct(this.return_y_cutoff - 1, { translateX: false });

        const upper_return_y_cutoff = this.return_y_cutoff;
        const upper_output_diff = this.sa.y - output;
        /**
         * Round cutoff down instead of up because it on average made more sense.
         * For example, 45 as the lower diff and 15 as the upper diff used to choose the upper diff using >
         * Now, >= chooses the lower diff because it seems to just be a better choice in general. 
         */
        if (this.min_work_time_funct_round >= (upper_output_diff + lower_output_diff) / 2) {
            this.return_y_cutoff = lower_return_y_cutoff;
        } else {
            this.return_y_cutoff = upper_return_y_cutoff;
        }
    }


    if (this.sa.due_time && (this.sa.due_time.hour || this.sa.due_time.minute)
        // "TimeWeb is already able to recognize and manipulate the red line to nullify work inputs at midnight."

        // After giving the replied to suggestion a lot of thought, I am considering perhaps removing this check and allowing for the 
        // graph to generate bogus schedules that assign work between 12:00 AM and 8:00 AM. The following will explain my reasoning for
        // why this check should be removed:

        // 1) It discourages users to set due dates at times such as 8 AM

        // title. the replied to suggestion explains all of the issues with setting a due date at 8 AM. After seeing that they have to 
        // work between midnight and 8 AM, users will feel inclined to fix this by changing their due date back to 12 AM, which is what I 
        // want. Not removing this check makes the graph seem less wrong; the user might now think that it's OK to enter a due date at a 
        // time such as 8 AM when they see a work schedule that isn't messed up.

        // 2) It makes it harder to say you want to work on the last day

        // If I don't remove this check and always nullify work inputs at midnight, it could be quite frustrating to the user. What if they
        // want to work between 12:00 AM and 8:00 AM, but TimeWeb doesn't allow them and instead assigns nullifies the amount of work to do
        // in that timeframe?

        // 3) Compromises can be made

        // It doesn't have to be an either/or decision — I can incorporate advantages from both sides of the suggestion that reduce
        // the risk of removing this check. I can warn the user before submitting the creation of an assignment if they enter a due time 
        // between 12:00 AM - 11:59 AM and very clearly describe the dangers of setting a due time that early.
        && 0) {
        // With early due times, return_y_cutoff may be on the last day, resulting in situations where you would have to work past midnight until the due time
        // To help prevent this, we need to see if working on the last day would result in a slope that violates the minimum work time (NOT min_work_time_funct_round because the user only cares about 
        // their inputted minimum work time. Another reason to use this is because the last day of an assignment doesn't really care about the step size)
        // If it does, simply decrement the cutoff (another way to think of this is by forcing the ignore ends setting to be off for the last day if it has a due time)

        // TODO: Another possible way of going about this issue is to do a similar sort of check before return_y_cutoff is set
        // This check, if activated, would simulate a work schedule without a due time to ensure work isnt assigned to the last day with the due time
        // However, this would be much harder to code. I may implement this in the future as this could possibly be more accurate, but see no reason to as my current implementation is accurate enough
        this.return_0_cutoff = NaN; // ensure funct never returns early for this cutoff
        let dy = this.sa.y - this.funct(Math.floor(this.sa.complete_x));
        let dx = this.sa.complete_x - Math.floor(this.sa.complete_x);
        let last_day_min_work_time = dy / dx;
        if (last_day_min_work_time > this.sa.min_work_time
            // Ensure the assignment date doesn't return y
            && this.return_y_cutoff > 1) {
            this.return_y_cutoff--;
        }
    }


    if (SETTINGS.loosely_enforce_minimum_work_times && this.sa.min_work_time) {
        var y_value_to_cutoff = 0;
    } else if (this.sa.funct_round < this.sa.min_work_time && (!this.a && this.b < this.min_work_time_funct_round || this.a && (this.a > 0) === (funct_zero < this.cutoff_to_use_round))) {
        var y_value_to_cutoff = this.min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = this.min_work_time_funct_round - this.sa.funct_round / 2;
    }

    if (mathUtils.precisionRound(y_value_to_cutoff - y1, 10) < 0 && this.sa.y > this.red_line_start_y && (this.a || this.b)) {
        if (this.a) {
            this.return_0_cutoff = (Math.sqrt(this.b * this.b + 4 * this.a * y_value_to_cutoff) - this.b) / this.a / 2;
        } else {
            this.return_0_cutoff = y_value_to_cutoff / this.b;
        }
        this.return_0_cutoff = mathUtils.precisionRound(this.return_0_cutoff, 10);
    } else {
        this.return_0_cutoff = 0;
    }

    left = Math.floor(this.return_0_cutoff);
    right = x1;
    while (left < right) {
        const mid = left + Math.floor((right - left) / 2);

        output = this.funct(mid, { translateX: false });
        if (output < mathUtils.precisionRound(this.min_work_time_funct_round + this.red_line_start_y, 10)) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    this.return_0_cutoff = Math.max(0, left - 1);
    output = this.funct(this.return_0_cutoff + 1, { translateX: false });

    if (SETTINGS.loosely_enforce_minimum_work_times && this.sa.min_work_time) {
        const upper_return_0_cutoff = this.return_0_cutoff;
        const upper_output_diff = output - this.red_line_start_y;

        left = 0;
        right = upper_return_0_cutoff + 1;
        while (left < right) {
            const mid = left + Math.floor((right - left) / 2);

            output = this.funct(mid, { translateX: false });
            if (mathUtils.precisionRound(output - this.red_line_start_y, 10) <= 0) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        this.return_0_cutoff = Math.max(0, left - 1);
        output = this.funct(this.return_0_cutoff + 1, { translateX: false });

        const lower_return_0_cutoff = this.return_0_cutoff;
        const lower_output_diff = output - this.red_line_start_y;
        // Pick whichever cutoff its output diff is closest to

        /**
         * Round cutoff down instead of up because it on average made more sense.
         * For example, 45 as the lower diff and 15 as the upper diff used to choose the upper diff using >
         * Now, >= chooses the lower diff because it seems to just be a better choice in general. 
         */
        if (this.min_work_time_funct_round >= (lower_output_diff + upper_output_diff) / 2) {
            this.return_0_cutoff = upper_return_0_cutoff;
        } else {
            this.return_0_cutoff = lower_return_0_cutoff;
        }
    }
}
Assignment.prototype.funct = function (x, params = { translateX: true }) {
    assert(Number.isInteger(x));
    if (params.translateX !== false) {
        // Translate x coordinate and break days
        x -= this.red_line_start_x;
        if (this.sa.break_days.length) { // let's keep this if statement here because the efficiency of this function matters
            const mods = this.calcModDays();
            x -= Math.floor(x / 7) * this.sa.break_days.length + mods[x % 7];
        }
        // Return at cutoffs
        if (x >= this.return_y_cutoff) return this.sa.y;
        if (x <= this.return_0_cutoff) return this.red_line_start_y;
    }
    if (this.sa.funct_round < this.sa.min_work_time && (!this.a && this.b < this.min_work_time_funct_round || this.a && (this.a > 0) === (x < this.cutoff_to_use_round))) {
        // Get untranslated y coordinate for min_work_time_funct_round
        var output = this.min_work_time_funct_round * Math.round(x * (this.a * x + this.b) / this.min_work_time_funct_round);
        // Translate the cutoff transition value
        if (this.a < 0) {
            output += this.cutoff_transition_value;
        } else {
            output -= this.cutoff_transition_value;
        }
    } else {
        // Get raw untranslated y coordinate
        var output = this.sa.funct_round * Math.round(x * (this.a * x + this.b) / this.sa.funct_round);
    }
    if (output) {
        output += (this.sa.y - this.red_line_start_y) % this.sa.funct_round;
    }
    // Return translated y coordinate
    return mathUtils.precisionRound(output + this.red_line_start_y, 10);
}
Assignment.prototype.calcModDays = function () {
    // explain this later
    let mods = [0],
        mod_counter = 0;
    for (let mod_day = 0; mod_day < 6; mod_day++) {
        if (this.sa.break_days.includes((this.assign_day_of_week + this.red_line_start_x + mod_day) % 7)) {
            mod_counter++;
        }
        mods.push(mod_counter);
    }
    return mods;
}
Assignment.prototype.calcAandBfromOriginAndTwoPoints = function (point_1, point_2) {
    // Connect (0,0), (point_1[0], point_1[1]), and (point_2[0], point_2[1])
    const x1 = point_1[0];
    const y1 = point_1[1];
    const x2 = point_2[0];
    const y2 = point_2[1];
    // http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
    const a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
    const b = (y1 - x1 * x1 * a) / x1;

    // I need to check if all three points are colinear to avoid roundoff errors
    // determine if the slopes between [0, 0] and [x1, y1] and [x1, y1] and [x2, y2] are the same

    // NOTE: we cannot just check for this.sa.skew_ratio === 1 because some calls to this function define skew_ratio itself
    // if the value of skew_ratio is 1 before the call, it will still remain 1 after the call due to this check, making it impossible to another value
    // more context: https://github.com/ArhanChaudhary/TimeWeb/commit/e79109f7571a6d8fd10bdfb77812afe6a4de0d8a

    let first_slope = y1 / x1;
    let second_slope = (y2 - y1) / (x2 - x1);
    // TODO: very buggy (roundoff errors) but should work 99.9% of the time
    if (second_slope === 0 && first_slope === 0 || second_slope !== 0 && Math.abs(first_slope / second_slope - 1) < 0.0000001)
        // note: cases where a and b are Infinity are false for the above check

        // i can use first_slope or second_slope instead of y2/x2, they are all the same
        return { a: 0, b: y2 / x2 };
    return { a, b };
}
Assignment.MAX_WORK_INPUTS_AUTOTUNE = 1000;
Assignment.THIRD_POINT_STEP = 0.01;
Assignment.MATRIX_ENDS_WEIGHT = 10000;

// There is a deadlock netween autotuneSkewRatioIfInDynamicMode and setDynamicStartInDynamicMode:
// When dynamic start is set, skew ratio needs to be re-autotuned
// But when skew ratio is re-autotuned, it may mess up dynamic start
// This variable is the number of iterations setDynamicStartInDynamicMode and autotuneSkewRatioIfInDynamicMode should be run

// There's a chance this might not even be needed but it seems to provide a more accurate skew ratio
// Resetting the dynamic mode start still might produce different autotuned_skew_ratio values because the dynamic start is changing,
// compared to only autotuning is once which completely ignores if dynamic start changing has a significant impact on the skew ratio
Assignment.AUTOTUNE_ITERATIONS = 3; // used to be 3, used to be 4, now is 3

// note: you're going to see a bunch of images from the really old versions of timeweb so bear
// with me here

/*
PREFACE (explaining what the point of this algorithm is):

My original view of timeweb in its very early first draft was to simply make the red line 
fixed at (0,0). This naive design implementation allows cases like these to instantiate:
https://cdn.discordapp.com/attachments/890505752064716811/991842831587094599/unknown.png

according to this you have to do 565 minutes on one day and then 115  minutes on the next,
which makes no sense at all because a curvature of 0 is supposed to be linear and
you're doing much more work on the first day than the second

my solution to that is dynamic mode: a toggleable mode of the graph that repositions the red line:
https://cdn.discordapp.com/attachments/890505752064716811/991842965993558097/unknown.png

I initially made the red line change its start to the end of the blue line ONLY when a work 
input doesn't match the schedule (i.e. diverges from it)

so for example if you have to do 5 minutes of work on one day but you do none, the red line changes
but if you complete the exact amount of work you're supposed to then the red line doesn't change

this second implementation worked way better than the original one and shined when the assignment
had a curvature of 0

however, in the contrary case, it caused a bunch of chaos; say you have an assignment like 
this, nothing wrong with it yet
https://cdn.discordapp.com/attachments/890505752064716811/991843194272763985/unknown.png

lets say you do nothing for the first 10 days
https://cdn.discordapp.com/attachments/890505752064716811/991843262262415430/unknown.png

according to the graph, you're supposed to do 1 minute of work on the 10th day
but if you don't do that minute of work then as I said above what dynamic mode does
is change the red line to the end of the blue line

but then after it does that i think you can see where the problem is:
https://cdn.discordapp.com/attachments/890505752064716811/991843395406413855/unknown.png

it's important to note that coidng wise everything so far is working exactly how i have told it to
but the nature of the low curvature makes it so that when it's readjusted you AGAIN 
don't do any more work for 10 more days, which is really unrealistic

a curvature of -1.327 isn't even that low yet in this case it's causing you to do nothing 
for the entire first half of the assignment

an even more absurd case:
https://cdn.discordapp.com/attachments/834305828487561216/871865329020723210/Screen_Shot_2021-08-02_at_2.20.42_PM.png

note that the current version of timeweb doesn't always blindly set the red line start
to the end of the blue line, it does a bit more than that for more realism but the same ideas
still imply. for the purposes of understanding the algorithm, assume that this is always the case

the goal of the algorithm is to automatically edit the curvature in the most ideal way possible
in scenarios like these
*/
Assignment.prototype.autotuneSkewRatioIfInDynamicMode = function (params = { inverse: true }) {
    /*
    TABLE OF CONTENTS
    the goal of the autotuning algorithm is to modify the curvature of an assignment such that:
    1. uses weighted least squares regression to generate a parabola from (0,0) (x1,y1) 
    using the work inputs
    2. "transfers" the curvature of the line from a global scope to the red line start dynamic
    mode scope
    3. Sets an autotune factor for the autotuned curvature to set the original on a spectrum to the
    new curvature
    4. Reverses the exponential decay sequence double dipping on the autotune factor since the
    algorithm is run many times for a single auototune
    5. Autotunes the auotuned curvature closer to linear the end of the assignment gets closer
    6. Autotunes the curvature closer to the inverse of the autotuned curvature
    */
    if (this.sa.fixed_mode) return;
    const old_skew_ratio = this.sa.skew_ratio;

    /*
    STEP 1: Weighted Least Squares Regression
    Let's remind ourselves the end goal:
    we want to change the curvature from this:
    https://cdn.discordapp.com/attachments/834305828487561216/871865329020723210/Screen_Shot_2021-08-02_at_2.20.42_PM.png

    to something like this:
    https://cdn.discordapp.com/attachments/834305828487561216/871865423820382248/Screen_Shot_2021-08-02_at_2.20.52_PM.png

    we can deduce a criteria for an ideal red line curvature to be one that retains the
    same shape of the best fit parabola curve through our prior work inputs — leading us
    to our first clue: regression

    A normal regression through the past work inputs doesn't always pass through the origin,
    something we assume to always be true, and this time we can't simply translate the regressed
    parabola to the origin because it then wouldn't be an accurate regression:  
    https://cdn.discordapp.com/attachments/890505752064716811/991846369247629322/unknown.png

    We need to get a bit more creative and utilize weighted least-squared regression; by applying
    some gigantic weight value to the two constant points at (0,0) and (days between due date and
    assignment date, total number of units in an assignment), we can get a very accurate
    approximation of the best regression parabola

    don't worry about the fact that a large weight doesn't cause the parabola to *exactly*
    pass through these points. The a and b values are converted to valid curvature values

    Note: I will refer to "days between due date and assignment date" as "x" and
    "total number of units in an assignment" as "y" from now on
    

    Here are the final results of the a and b values extracted from the new weighted least-squared
    regression algorithm:
    https://cdn.discordapp.com/attachments/834305828487561216/872566881565962250/Screen_Shot_2021-08-04_at_12.48.42_PM.png
    https://cdn.discordapp.com/attachments/834305828487561216/872567530097614888/Screen_Shot_2021-08-04_at_12.51.32_PM.png
    */
    const works_without_break_days = this.sa.works.filter(function (work_input, work_input_index) {
        // If break days are enabled, filter out work inputs that are on break days
        // Use the same logic in calcModDays to detemine whether a work input is on a break day and add -1 at the end to select the work input after every non break day
        // Add work_input_index === 0 because the above logic may skip over the first work input
        return !this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + work_input_index - 1) % 7) || work_input_index === 0;
    }.bind(this));
    const len_works_without_break_days = works_without_break_days.length - 1;

    const original_red_line_start_x = this.red_line_start_x;
    const original_red_line_start_y = this.red_line_start_y;
    // red_line_start_x needs to be set for calcModDays to be accurate
    this.red_line_start_x = this.sa.blue_line_start;
    // red_line_start_y doesnt need to be set but do so anyways for consistency
    this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
    // number of working days between the start of the red line and the due date
    let x1_from_blue_line_start = this.sa.complete_x - this.red_line_start_x;
    
    const mods = this.calcModDays();
    x1_from_blue_line_start -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7];
    if (this.sa.break_days.includes(this.assign_day_of_week + Math.floor(this.sa.complete_x))) {
        x1_from_blue_line_start = Math.ceil(x1_from_blue_line_start);
    }

    // number of work inputs to do between the start of the red line and the due date
    let y1_from_blue_line_start = this.sa.y - this.red_line_start_y;

    // Roundoff errors
    if (x1_from_blue_line_start > Assignment.MAX_WORK_INPUTS_AUTOTUNE ||
    // Leads to zero divisions later on and NaN curvature values
    // Can happen when you don't complete an assignment by its due date
    x1_from_blue_line_start === 0) return;

    // Thanks to RedBlueBird (https://github.com/RedBlueBird) for the actual WLS!
    // https://github.com/ArhanChaudhary/TimeWeb/issues/3
    // Start of contribution
    const x_matrix = works_without_break_days.map((work_input, work_input_index) =>
        [
            Math.min(work_input_index, x1_from_blue_line_start),
            Math.pow(Math.min(work_input_index, x1_from_blue_line_start), 2)
        ]
    );
    const y_matrix = works_without_break_days.map(work_input => [work_input - this.sa.works[0]]);

    // Add the last point if it wasn't already added (to ensure the next statement doesn't yield a false positive)
    if (len_works_without_break_days !== Math.ceil(x1_from_blue_line_start)) {
        x_matrix.push([x1_from_blue_line_start, Math.pow(x1_from_blue_line_start, 2)]);
        y_matrix.push([y1_from_blue_line_start]);
    }

    let autotuned_skew_ratio;
    // A parabola cant be defined with less than 3 points
    if (y_matrix.length >= 3) {
        const X = new mlMatrix.Matrix(x_matrix);
        const Y = new mlMatrix.Matrix(y_matrix);

        let T = X.clone();
        T.data[T.data.length - 1][0] *= Assignment.MATRIX_ENDS_WEIGHT;
        T.data[T.data.length - 1][1] *= Assignment.MATRIX_ENDS_WEIGHT;
        T = T.transpose();

        result = mlMatrix.inverse(T.mmul(X)).mmul(T).mmul(Y)
        let a = result.data[1][0];
        let b = result.data[0][0];
        // End of contribution

        /*
        STEP 2: Transferring the curvature
        Our WLS algorithm generates a parabola form the origin to (x, y), but as it turns out
        the exact curvature from that parabola isn't always desired

        Let's elaborate on what is meant by that — let's say your graph looks like this (the
        blue line is your work inputs and the green line is the WLS regression):
        https://cdn.discordapp.com/attachments/836818352160243722/991797882233565374/unknown.png

        Since this green line is pretty low, its curvature will be pretty decently negative

        If we directly apply this curvature to the start of the red line, we'll get something like this:
        https://cdn.discordapp.com/attachments/836818352160243722/991798348057149572/unknown.png
        literally bringing us back to square one

        Thankfully, the efforts put into WLS aren't in vain. Perhaps we can find a better way
        to transfer the WLS curvature to the red line...

        as a reminder, the red line needs only one more control point to create a
        complete parabola. What if we use (x-0.01, f(x-0.01)) on the green line as our 
        third point?

        the precise logic of translating the parabola and untranslating it is hard to wrap
        your head around, so I've created a desmos graph to clearly demonstrate how this works
        https://www.desmos.com/calculator/fxznq4cjka

        Notice the three points that form the red line (in this case colored purple) — the
        green point, the black point, and the red point right next to the black point
        (bit hard to see):
        https://cdn.discordapp.com/attachments/836818352160243722/991803369347883008/unknown.png
        */

        let x2 = x1_from_blue_line_start - Assignment.THIRD_POINT_STEP;
        let y2 = x2 * (a * x2 + b);

        // Change the scope of the skew ratio to x1 ("transfer" the skew ratio value from
        // x1_from_blue_line_start to x1)
        this.red_line_start_x = original_red_line_start_x;
        this.red_line_start_y = original_red_line_start_y;
        let x1 = this.sa.complete_x - this.red_line_start_x;
        let y1 = this.sa.y - this.red_line_start_y;

        const mods = this.calcModDays();
        x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7]; // Handles break days, explained later
        if (this.sa.break_days.includes(this.assign_day_of_week + Math.floor(this.sa.complete_x))) {
            x1 = Math.ceil(x1);
        }

        // x1_from_blue_line_start - x1 simplifies to red_line_start_x - blue_line_start
        // y1_from_blue_line_start - y1 simplifies to red_line_start_y - works[0]
        // Translate the point to the scope of x1
        x2 -= x1_from_blue_line_start - x1;
        y2 -= y1_from_blue_line_start - y1;
        const parabola = this.calcAandBfromOriginAndTwoPoints([x2, y2], [x1, y1]);
        autotuned_skew_ratio = (parabola.a + parabola.b) * x1 / y1;

        // Zero division somewhere
        if (!Number.isFinite(autotuned_skew_ratio)) return;

    } else {
        // A parabola cannot be defined by two or less points; instead connect a line
        autotuned_skew_ratio = 1;
    }
    if (params.inverse) {
        /*
        STEP 3: Defining an autotune factor
        With only one work input, the regression algorithm is heavily skewed towards that one
        work input, resulting in nonsensical curvatures such as these:
        https://cdn.discordapp.com/attachments/834305828487561216/872673400257118228/Screen_Recording_2021-08-04_at_7.51.42_PM.mov

        We need some sort of way to make this algorithm less influential at the start and more
        influential at the end by defining an autotuning factor
        
        (which when closer to 0, will be more inclined to retain the original curvature value,
        and when closer 1, will be more inclined to change to the new curvature value)

        Defining such a factor is more simple that you think:
        autotune factor = number of work inputs / number of working days between the start of
        the red line and the due date

        forming a linear gradient that successfully mitigates this issue
        */

        // Math.min(..., 1) to make sure the autotune factor is never greater than 1 (this 
        // can happen with due times)
        var autotune_factor = Math.min(works_without_break_days.length / x1_from_blue_line_start, 1);

        /*
        STEP 4: Nullifying repeated iterations
        The algorithms to autotune the curvature and the start of the red line have an
        annoying deadlock — When the dynamic mode red line start is set, the curvature needs
        to be re-autotuned, but when curvature is re-autotuned, it may mess up the
        dynamic mode red line start

        the specifcs of setting the dynamic start aren't directly relevant to this algorithm.
        The key takeaway is the fact that I have to loop through and repeat these two functions
        many times:
        for (let i = 0; i < Assignment.AUTOTUNE_ITERATIONS; i++) {
            this.setDynamicStartIfInDynamicMode();
            this.autotuneSkewRatio();
        }
        this.setDynamicStartIfInDynamicMode();

        The problem with this is rerunning the autotuning algorithm is that it magnifies 
        the curvature by double dipping this algorithm

        for example if the autotune factor is 0.5, the new curvature is 30, the initial
        curvature is 0, and we want to iterate through the loop three times, then the
        new curvature values would go from: 15 => 22.5 => 25.25

        Note that the point of the iterating has to do with dynamic mode, not the autotuning
        (i.e. I'm forced to also iterate the autotuning algorithm as a side effect)

        if the autotune factor is 0.5 and the new curvature is 30 i would expect the new 
        autotuned skew ratio to be 15 but it is instead 25.25

        The goal of this step is to nerf the autotune factor such that 
        the new curvature after iterating will be the same value as if it has only ran one
        i.e. iterating it three times makes the autotuned curvature 15 instead of 25.25

        15 => 22.5 => 25.25 is an exponential decay sequence can be modeled by the equation:
        s - (s-i)(1-a)^n
        (with s being the autotuned curvature, i being the initial curvature,
        a being the autotune factor, and n being the iteration number)

        We can then formulate the following equality, with x being the new,
        adjusted autotune factor:
        s - (s-i)(1-x)^n = s - (s-i)(1-a)^1

        solving for x:
        -(s-i)(1-x)^n = -(s-i)(1-a)
        (1-x)^n =(1-a)
        1 - x = (1-a)^(1/n)
        x = 1 - (1-a)^(1/n)

        Let's run a test case for this step:
        if a is 0.5, s is 30, i is 0, and the total n is 3:
        30 - (30-0)(1-0.5)^1 = 15
        30 - (30-0)(1-0.5)^2 = 22.5
        30 - (30-0)(1-0.5)^3 = 25.25, very different from f(1)

        Using x as the new autotune factor:
        x = 1 - (1-a)^(1/n) = 1 - (1 - 0.5)^(1/3) = 0.20629

        30 - (30-0)(1-0.20629)^1 = 6.19
        30 - (30-0)(1-0.20629)^2 = 11.1
        30 - (30-0)(1-0.20629)^3 = 15 (success)
        */
        autotune_factor = 1 - Math.pow(1 - autotune_factor, 1 / Assignment.AUTOTUNE_ITERATIONS);

        /*
        STEP 5: Autotuning the autotune

        Remember how I defined the autotune factor earlier?
        number of work inputs / number of working days between the start of
        the red line and the due date
        
        Let's try to apply that to this graph:
        https://cdn.discordapp.com/attachments/841105983388254208/895850651286896660/Screen_Shot_2021-10-07_at_6.50.17_PM.png

        1 / 4 = 25%, an extremely significant number for only one data point that allows
        for this to happen:
        https://cdn.discordapp.com/attachments/841105983388254208/895850666843582514/Screen_Shot_2021-10-07_at_6.50.26_PM.png

        even with the autotune factor, the graph still dramatically changes

        this step of the algorithm simply autotunes the already autotuned curvature
        closer to linear as there are fewer work inputs left to input in an assignment
        */
        autotuned_skew_ratio += (1 - autotuned_skew_ratio) * autotune_factor;

        /**
        STEP 6: Reflecting the entire parabola
        This step is simple but very contradictory — before we do any of the autotuning we
        need to reflect the entire autotuned curvature over y=x (i.e negating the curvature)

        While we do want to preserve the shape of the parabola formed by your past work inputs,
        we also want dynamic mode to be, well, dynamic (in that the curvature adapts to your
        work schedule)
        
        we want to ideally punish those who dont work by making an assignment more important and
        have a higher priority if they don't work on it

        and vice versa; we want to ideally reward those who do work by making an assignment
        less important and have a lower priority
        
        thus we can redefine our goal to be the mirror of the parabolic continuation steps 1-5 achieve
        testing shows that this doesn't have much impact on this algorithm's other primary goal of
        preserving the shape of the parabola from past work inputs

        Note: the order of step 6 and step 5 does not matter
        remember, 2 - autotuned_skew_ratio reflects the curvature y = x and
        (1 - autotuned_skew_ratio) * autotune_factor skews it towards linear

        its a sort of translation and reflection, and they both hold the same property
        of transforming the same way regardless of the order
        */

        autotuned_skew_ratio = 2 - autotuned_skew_ratio;

    } else {
        // TODO: improve non inverse algorithm; this one currently works but not as well as I want
        var autotune_factor = Math.min(works_without_break_days.length / x1_from_blue_line_start, 1);
        autotune_factor = 1 - Math.pow(1 - autotune_factor, 1 / Assignment.AUTOTUNE_ITERATIONS);
        autotuned_skew_ratio += (1 - autotuned_skew_ratio) * autotune_factor;
    }
    // The part of step 3 that actually autotunes the skew ratio
    this.sa.skew_ratio += (autotuned_skew_ratio - this.sa.skew_ratio) * autotune_factor;
    const skew_ratio_bound = this.calcSkewRatioBound();
    this.sa.skew_ratio = mathUtils.clamp(2 - skew_ratio_bound, this.sa.skew_ratio, skew_ratio_bound);
    // !this.sa.needs_more_info probably isn't needed, but just in case as a safety meachanism
    !this.sa.needs_more_info && this.sa.skew_ratio !== old_skew_ratio && ajaxUtils.batchRequest("saveAssignment", ajaxUtils.saveAssignment, { skew_ratio: this.sa.skew_ratio, id: this.sa.id });
}