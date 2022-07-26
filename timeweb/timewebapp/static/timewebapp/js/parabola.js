/* 
The red line for all of the assignments follow a parabola
The first part of the setParabolaValues() function calculates the a and b values, and the second part handles the minimum work time and return cutoffs
this.funct(n) returns the output of an^2 + bn (with no c variable because it is translated to go through the origin)
set_mod_days() helps integrate break days into the schedule 
*/
Assignment.prototype.setParabolaValues = function() {
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

    const parabola = this.calcAandBfromOriginAndTwoPoints([1, y1/x1 * this.sa.skew_ratio], [x1, y1]);
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
                const prev_output = mathUtils.clamp(0, this.funct(Math.floor(this.cutoff_to_use_round), {translateX: false}), this.sa.y);
                const output = mathUtils.clamp(0, this.funct(Math.ceil(this.cutoff_to_use_round), {translateX: false}), this.sa.y);
                if (output - prev_output) {
                    this.cutoff_transition_value = this.min_work_time_funct_round - (output - prev_output);
                }
            }
        }
    }
    if (SETTINGS.ignore_ends && this.sa.min_work_time) {
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
            this.return_y_cutoff = y_value_to_cutoff/this.b;
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

        output = this.funct(mid, {translateX: false});
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
    output = this.funct(this.return_y_cutoff - 1, {translateX: false});


    if (SETTINGS.ignore_ends && this.sa.min_work_time) {
        const lower_return_y_cutoff = this.return_y_cutoff;
        const lower_output_diff = this.sa.y - output;

        left = lower_return_y_cutoff;
        right = x1;
        while (left < right) {
            const mid = left + Math.floor((right - left) / 2);

            output = this.funct(mid, {translateX: false});
            if (output < this.sa.y) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        this.return_y_cutoff = left;
        output = this.funct(this.return_y_cutoff - 1, {translateX: false});

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
        // this could be a quite controversial decision to disable this check; I'll let my message in #suggestions do the talking:
        // https://canary.discord.com/channels/832155860306362438/842171586295758858/997343202292023356
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
        let last_day_min_work_time = dy/dx;
        if (last_day_min_work_time > this.sa.min_work_time
            // Ensure the assignment date doesn't return y
            && this.return_y_cutoff > 1) {
            this.return_y_cutoff--;
        }
    }


    if (SETTINGS.ignore_ends && this.sa.min_work_time) {
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

        output = this.funct(mid, {translateX: false});
        if (output < mathUtils.precisionRound(this.min_work_time_funct_round + this.red_line_start_y, 10)) {
            left = mid + 1;
        } else {
            right = mid;
        }
    }
    this.return_0_cutoff = Math.max(0, left - 1);
    output = this.funct(this.return_0_cutoff + 1, {translateX: false});
    
    if (SETTINGS.ignore_ends && this.sa.min_work_time) {
        const upper_return_0_cutoff = this.return_0_cutoff;
        const upper_output_diff = output - this.red_line_start_y;

        left = 0;
        right = upper_return_0_cutoff + 1;
        while (left < right) {
            const mid = left + Math.floor((right - left) / 2);

            output = this.funct(mid, {translateX: false});
            if (mathUtils.precisionRound(output - this.red_line_start_y, 10) <= 0) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        this.return_0_cutoff = Math.max(0, left - 1);
        output = this.funct(this.return_0_cutoff + 1, {translateX: false});

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
Assignment.prototype.funct = function(x, params={translateX: true}) {
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
Assignment.prototype.calcModDays = function() {
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
Assignment.prototype.calcAandBfromOriginAndTwoPoints = function(point_1, point_2) {
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

    let first_slope = y1/x1;
    let second_slope = (y2-y1)/(x2-x1);
    // TODO: very buggy (roundoff errors) but should work 99.9% of the time
    if (second_slope === 0 && first_slope === 0 || second_slope !== 0 && Math.abs(first_slope / second_slope - 1) < 0.0000001)
        // note: cases where a and b are Infinity are false for the above check

        // i can use first_slope or second_slope instead of y2/x2, they are all the same
        return {a: 0, b: y2 / x2};
    return {a, b};
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

Assignment.prototype.autotuneSkewRatioIfInDynamicMode = function(params={ inverse: true }) {
    if (this.sa.fixed_mode) return;
    const old_skew_ratio = this.sa.skew_ratio;

    const works_without_break_days = this.sa.works.filter(function(work_input, work_input_index) {
        // If break days are enabled, filter out work inputs that are on break days
        // Use the same logic in calcModDays to detemine whether a work input is on a break day and add -1 at the end to select the work input after every non break day
        // Add work_input_index === 0 because the above logic may skip over the first work input
        return !this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + work_input_index - 1) % 7) || work_input_index === 0;
    }.bind(this));
    const len_works_without_break_days = works_without_break_days.length - 1;

    const original_red_line_start_x = this.red_line_start_x;
    const original_red_line_start_y = this.red_line_start_y;
    // red_line_start_x needs to be set for calcModDays; also set red_line_start_y for consistency
    this.red_line_start_x = this.sa.blue_line_start;
    this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
    let x1_from_blue_line_start = this.sa.complete_x - this.red_line_start_x;
    let y1_from_blue_line_start = this.sa.y - this.red_line_start_y;

    const mods = this.calcModDays();
    x1_from_blue_line_start -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) % 7]; // Handles break days, explained later
    if (this.sa.break_days.includes(this.assign_day_of_week + Math.floor(this.sa.complete_x))) {
        x1_from_blue_line_start = Math.ceil(x1_from_blue_line_start);
    }

    // Roundoff errors
    if (x1_from_blue_line_start > Assignment.MAX_WORK_INPUTS_AUTOTUNE) return;
    // The first part calculates the a and b values for the least squares curve from works_without_break_days using WLS quadratic regression
    // Using WLS, we can put a lot of weight on (0,0) and (x1_from_blue_line_start, y1_from_blue_line_start) to ensure the curve is valid by passing through these two points
    // NOTE: don't worry about the fact that a large weight doesn't cause the parabola to exactly pass through these points. The a and b values are converted to valid skew ratio values

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
    if (y_matrix.length >= 3) {
        // Thanks to RedBlueBird (https://github.com/RedBlueBird) for this part!
        // https://github.com/ArhanChaudhary/TimeWeb/issues/3
        const X = new mlMatrix.Matrix(x_matrix);
        const Y = new mlMatrix.Matrix(y_matrix);

        let T = X.clone();
        T.data[T.data.length-1][0] *= Assignment.MATRIX_ENDS_WEIGHT;
        T.data[T.data.length-1][1] *= Assignment.MATRIX_ENDS_WEIGHT;
        T = T.transpose();

        result = mlMatrix.inverse(T.mmul(X)).mmul(T).mmul(Y)
        let a = result.data[1][0];
        let b = result.data[0][0];
        // End of contribution

        // The second part's goal is to now "transfer" the skew ratio value from x1_from_blue_line_start to x1
        // Although it may seem reasonable to just directly transfer the exact skew ratio value, this isn't actually ideal
        // For instance, low skew ratios never allow users to do work because the start keeps changing
        // Instead, we need to do this a different way
        // We take the point of x1_from_blue_line_start and subtract it by a small value, in this case third_point_step
        // Then, once the scope of the skew ratio changes to x1, connect (0,0), the point, and (x1, y1) to get the autotuned skew ratio
        let x2 = x1_from_blue_line_start - Assignment.THIRD_POINT_STEP;
        let y2 = x2 * (a * x2 + b);

        // Change the scope of the skew ratio to x1
        this.red_line_start_x = original_red_line_start_x;
        this.red_line_start_y = original_red_line_start_y;
        let x1 = this.sa.complete_x - this.red_line_start_x;
        let y1 = this.sa.y - this.red_line_start_y;

        const mods = this.calcModDays();
        x1 -= Math.floor((this.sa.x - this.red_line_start_x) / 7) * this.sa.break_days.length + mods[(this.sa.x - this.red_line_start_x) & 7]; // Handles break days, explained later
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
        // Finally, we need to set an autotune factor
        // This is because if a user enters no work done as their first work input, the regression will calculate an extremely downward curve with a low skew ratio, which is not ideal
        // So, only change the original skew ratio by (works_without_break_days.length / x1_from_blue_line_start)%
        // This way ensures the autotune becomes more effective as more data points are made available for the regression

        // Math.min(..., 1) to make sure the autotune factor is never greater than 1 (this can happen with due times)
        var autotune_factor = Math.min(works_without_break_days.length / x1_from_blue_line_start, 1);

        // Way too much to say about this, will explain later
        autotune_factor = 1 - Math.pow(1 - autotune_factor, 1 / Assignment.AUTOTUNE_ITERATIONS);

        // Autotune in the inverse direction 
        // the order of this and autotuned_skew_ratio += (1 - autotuned_skew_ratio) * autotune_factor; doesn't matter because,
        // remember, 2 - autotuned_skew_ratio reflects the curvat y = x and (1 - autotuned_skew_ratio) * autotune_factor skews it towards linear
        // If you think about it, the order of this and the below statement doesn't matter (confirmed and tested with many test cases)
        autotuned_skew_ratio = 2 - autotuned_skew_ratio;

        // A slight problem with this is the autotune factor doesn't really work when there are few days in the assignment
        // For example, if the user entes one work input on an assignment with three or four days, the autotune factor will be 1/3 or 1/4 or 33% or 25%, which is a very high percent for only one work input as a data point
        // So, put a higher weight on a linear skew ratio as there are less days in the assignment
        autotuned_skew_ratio += (1 - autotuned_skew_ratio) * autotune_factor;

    } else {
        // TODO: improve non inverse algorithm; this one currently works but not as well as I want
        var autotune_factor = Math.min(works_without_break_days.length / x1_from_blue_line_start, 1);
        autotune_factor = 1 - Math.pow(1 - autotune_factor, 1 / Assignment.AUTOTUNE_ITERATIONS);
        autotuned_skew_ratio += (1 - autotuned_skew_ratio) * autotune_factor;
    }
    this.sa.skew_ratio += (autotuned_skew_ratio - this.sa.skew_ratio) * autotune_factor;
    // this.sa.skew_ratio = autotuned_skew_ratio;
    const skew_ratio_bound = this.calcSkewRatioBound();
    this.sa.skew_ratio = mathUtils.clamp(2 - skew_ratio_bound, this.sa.skew_ratio, skew_ratio_bound);
    // !this.sa.needs_more_info probably isn't needed, but just in case as a safety meachanism
    !this.sa.needs_more_info && this.sa.skew_ratio !== old_skew_ratio && ajaxUtils.batchRequest("sendAttributeAjax", {skew_ratio: this.sa.skew_ratio, id: this.sa.id});
}