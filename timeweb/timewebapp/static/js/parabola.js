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
    */
    // Define (x1, y1) and translate both variables to (0,0)
    let x1 = this.sa.x - this.red_line_start_x,
        y1 = this.sa.y - this.red_line_start_y;
    if (this.sa.break_days.length) {
        const mods = this.calcModDays();
        x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + mods[x1 % 7];
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
    // It probably is possible to avoid a deadlock, but I don't have the time to attempt fixing this
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
    if (ignore_ends && this.sa.min_work_time) {
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
    if (this.return_y_cutoff < 2500) {
        let output;
        for (;this.return_y_cutoff > 1; this.return_y_cutoff--) {
            // do ceil-1 instead of floor because ceil-1 is inclusive of ints; lower_output_diff is the difference between y and the output of the value one less than lower_return_y_cutoff
            output = this.funct(Math.ceil(this.return_y_cutoff - 1), {translateX: false});
            if (output <= this.sa.y - this.min_work_time_funct_round) break;
        }
        // If loop doesn't run, then 0 < return_y_cutoff <= 1, meaning the untranslated output must be 0
        if (!(this.return_y_cutoff > 1)) {
            output = this.red_line_start_y;
        }

        // let left = 1;
        // let right = this.return_y_cutoff;
        // while (left < right) {
        //     const mid = left + Math.floor((right - left) / 2);

        //     output = this.funct(Math.ceil(this.return_y_cutoff - 1), {translateX: false});
        //     if (!(output <= this.sa.y - this.min_work_time_funct_round)) {
        //         right = mid;
        //     } else {
        //         left = mid + 1;
        //     }
        // }
        // output = left;


        if (ignore_ends && this.sa.min_work_time) {
            const lower_return_y_cutoff = this.return_y_cutoff;
            const lower_output_diff = this.sa.y - output;
            // If loop doesn't run, then x1 - 1 < return_y_cutoff <= x1
            output = this.sa.y - this.funct(Math.ceil(this.return_y_cutoff - 1), {translateX: false});
            for (;this.return_y_cutoff <= x1 - 1; this.return_y_cutoff++) {
                const next_output = this.funct(Math.floor(this.return_y_cutoff + 1), {translateX: false});
                // Leave output at the value before this
                if (next_output >= this.sa.y) break;
                output = next_output;
            }
            const upper_return_y_cutoff = this.return_y_cutoff;
            const upper_output_diff = this.sa.y - output;
            if (this.min_work_time_funct_round > (upper_output_diff + lower_output_diff) / 2) {
                this.return_y_cutoff = lower_return_y_cutoff;
            } else {
                this.return_y_cutoff = upper_return_y_cutoff;
            }
        }
    }
    if (ignore_ends && this.sa.min_work_time) {
        var y_value_to_cutoff = 0;
    } else if (this.sa.funct_round < this.sa.min_work_time && (!this.a && this.b < this.min_work_time_funct_round || this.a && (this.a > 0) === (funct_zero < this.cutoff_to_use_round))) {
        var y_value_to_cutoff = this.min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = this.min_work_time_funct_round - this.sa.funct_round / 2;
    }

    if (y_value_to_cutoff < y1 && this.sa.y > this.red_line_start_y && (this.a || this.b)) {
        if (this.a) {
            this.return_0_cutoff = (Math.sqrt(this.b * this.b + 4 * this.a * y_value_to_cutoff) - this.b) / this.a / 2;
        } else {
            this.return_0_cutoff = y_value_to_cutoff / this.b;
        }
        this.return_0_cutoff = mathUtils.precisionRound(this.return_0_cutoff, 10);
    } else {
        this.return_0_cutoff = 0;
    }
    if (x1 - this.return_0_cutoff < 2500) {
        let output;
        for (;this.return_0_cutoff < x1 - 1; this.return_0_cutoff++) {
            output = this.funct(Math.floor(this.return_0_cutoff + 1), {translateX: false});
            if (output >= this.min_work_time_funct_round + this.red_line_start_y) break;
        }
        if (!(this.return_0_cutoff < x1 - 1)) {
            // If loop doesn't run, then x1 - 1 <= this.return_0_cutoff < x1, meaning that the output must be this.sa.y
            // If the loops reaches the end, output has to be this.sa.y as that's the end of funct
            output = this.sa.y;
        }
        if (ignore_ends && this.sa.min_work_time) {
            const upper_return_0_cutoff = this.return_0_cutoff;
            const upper_output_diff = output;

            // If loop doesn't run, then 0 <= this.return_0_cutoff < 1
            output = this.funct(Math.floor(this.return_0_cutoff + 1), {translateX: false}) - this.red_line_start_y;
            for (;this.return_0_cutoff >= 1; this.return_0_cutoff--) {
                const next_output = this.funct(Math.ceil(this.return_0_cutoff - 1), {translateX: false});
                if (next_output <= this.red_line_start_y) break;
                output = next_output;
            }
            const lower_return_0_cutoff = this.return_0_cutoff;
            const lower_output_diff = output;
            // Pick whichever cutoff its output diff is closest to
            if (this.min_work_time_funct_round > (lower_output_diff + upper_output_diff) / 2) {
                this.return_0_cutoff = upper_return_0_cutoff;
            } else {
                this.return_0_cutoff = lower_return_0_cutoff;
            }
        }
    }
}
Assignment.prototype.funct = function(x, params={}) {
    if (params.translateX !== false) {
        // Translate x coordinate
        x -= this.red_line_start_x;
        if (this.sa.break_days.length) {
            const mods = this.calcModDays();
            x -= Math.floor(x / 7) * this.sa.break_days.length + mods[x % 7];
        }
        if (x >= this.return_y_cutoff) return this.sa.y;
        if (x <= this.return_0_cutoff) return this.red_line_start_y;
    }
    if (this.sa.funct_round < this.sa.min_work_time && (!this.a && this.b < this.min_work_time_funct_round || this.a && (this.a > 0) === (x < this.cutoff_to_use_round))) {
        // Get translated y coordinate
        var output = this.min_work_time_funct_round * Math.round(x * (this.a * x + this.b) / this.min_work_time_funct_round);
        if (this.a < 0) {
            output += this.cutoff_transition_value;
        } else {
            output -= this.cutoff_transition_value;
        }
    } else {
        var output = this.sa.funct_round * Math.round(x * (this.a * x + this.b) / this.sa.funct_round);
    }
    // Return untranslated y coordinate
    // No point in untranslating x coordinate
    return mathUtils.precisionRound(output + this.red_line_start_y, max_length_funct_round);
}
Assignment.prototype.calcModDays = function() {
    // 
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
    return {a: a, b: b};
}
Assignment.prototype.autotuneSkewRatio = function() {
    if (this.sa.fixed_mode) return;
    const works_without_break_days = this.sa.works.filter(function(work_input, work_input_index) {
        // If break days are enabled, filter out work inputs that are on break days
        // Use the same logic in calcModDays to detemine whether a work input is on a break day and add -1 at the end to select the work input after every non break day
        // Add work_input_index === 0 because the above logic may skip over the first work input
        return !this.sa.break_days.includes((this.assign_day_of_week + this.sa.blue_line_start + work_input_index - 1) % 7) || work_input_index === 0;
    }.bind(this));
    const original_red_line_start_x = this.red_line_start_x;
    const original_red_line_start_y = this.red_line_start_y;
    // red_line_start_x needs to be set for calcModDays; also set red_line_start_y for consistency
    this.red_line_start_x = this.sa.blue_line_start;
    this.red_line_start_y = this.sa.works[this.red_line_start_x - this.sa.blue_line_start];
    let x1_from_blue_line_start = this.sa.x - this.red_line_start_x;
    let y1_from_blue_line_start = this.sa.y - this.red_line_start_y;
    if (this.sa.break_days.length) {
        const mods = this.calcModDays();
        x1_from_blue_line_start -= Math.floor(x1_from_blue_line_start / 7) * this.sa.break_days.length + mods[x1_from_blue_line_start % 7]; // Handles break days, explained later
    }

    // The first part calculates the a and b values for the least squares curve from works_without_break_days using WLS quadratic regression
    // Using WLS, we can put a lot of weight on (0,0) and (x1_from_blue_line_start, y1_from_blue_line_start) to ensure the curve is valid by passing through these two points
    // NOTE: don't worry about the fact that a large weight doesn't cause the parabola to exactly pass through these points. The a and b values are converted to valid skew ratio values

    // Thanks to RedBlueBird (https://github.com/RedBlueBird) for this algorithm!
    // https://github.com/ArhanChaudhary/TimeWeb/issues/3
    const x_matrix = works_without_break_days.map((work_input, work_input_index) => [work_input_index, Math.pow(work_input_index, 2)]);
    x_matrix.push([x1_from_blue_line_start, Math.pow(x1_from_blue_line_start, 2)]);

    const y_matrix = works_without_break_days.map(work_input => work_input - this.sa.works[0]);
    y_matrix.push(y1_from_blue_line_start);

    const weight = Array(works_without_break_days.length + 1).fill(1); // Add +1 for the y_matrix.push(y1)
    weight[0] = 1e5;
    weight[weight.length - 1] = 1e5;
    const X = math.matrix(x_matrix);
    const Y = math.matrix(y_matrix);
    const W = math.diag(weight);
    
    let result = math.multiply(math.multiply(math.transpose(X),W),X);
    try {
        result = math.inv(result);
    } catch {
        // In case there are less than three unique points to form a skew ratio
        this.red_line_start_x = original_red_line_start_x;
        this.red_line_start_y = original_red_line_start_y;
        return;
    }
    result = math.multiply(math.multiply(result, math.multiply(math.transpose(X),W)),Y);
    let a = result._data[1];
    let b = result._data[0];

    // The second part's goal is to now "transfer" the skew ratio value from x1_from_blue_line_start to x1
    // Although it may seem reasonable to just directly transfer the exact skew ratio value, this isn't actually ideal
    // For instance, low skew ratios never allow users to do work because the start keeps changing
    // Instead, we need to do this a different way
    // We take the point of x1_from_blue_line_start and subtract it by a small value, in this case 0.01
    // Then, once the scope of the skew ratio changes to x1, connect (0,0), the point, and (x1, y1) to get the autotuned skew ratio
    const third_point_step = 0.01;
    let x2 = x1_from_blue_line_start - third_point_step;
    let y2 = x2 * (a * x2 + b);

    // Change the scope of the skew ratio to x1
    this.red_line_start_x = original_red_line_start_x;
    this.red_line_start_y = original_red_line_start_y;
    let x1 = this.sa.x - this.red_line_start_x;
    let y1 = this.sa.y - this.red_line_start_y;
    if (this.sa.break_days.length) {
        const mods = this.calcModDays();
        x1 -= Math.floor(x1 / 7) * this.sa.break_days.length + mods[x1 % 7]; // Handles break days, explained later
    }
    // x1_from_blue_line_start - x1 simplifies to red_line_start_x - blue_line_start
    // y1_from_blue_line_start - y1 simplifies to red_line_start_y - works[0]
    // Translate the point to the scope of x1
    x2 -= x1_from_blue_line_start - x1;
    y2 -= y1_from_blue_line_start - y1;
    const parabola = this.calcAandBfromOriginAndTwoPoints([x2, y2], [x1, y1]);
    // Finally, we need to set an autotune factor
    // This is because if a user enters no work done as their first work input, the regression will calculate an extremely downward curve with a low skew ratio, which is not ideal
    // So, only change the original skew ratio by (works_without_break_days.length / x1_from_blue_line_start)%
    // This way ensures the autotune becomes more effective as more data points are made available for the regression
    let autotune_factor = works_without_break_days.length / x1_from_blue_line_start;
    let autotuned_skew_ratio = (parabola.a + parabola.b) * x1 / y1;

    // Zero division somewhere
    if (!Number.isFinite(autotuned_skew_ratio)) return;

    this.sa.skew_ratio += (autotuned_skew_ratio - this.sa.skew_ratio) * autotune_factor;
    ajaxUtils.SendAttributeAjaxWithTimeout("skew_ratio", this.sa.skew_ratio, this.sa.id);
}