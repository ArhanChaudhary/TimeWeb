/* 
This file includes the code for:

Calculating the curve of the parabola
Implementing not working days, mininum work time, and amount of units to complete at a time
Determining the ideal position to return the maximum or minimum graph value
Returning an output from an x position on the parabola

This only runs on index.html
*/

//
// THIS FILE HAS NOT YET BEEN FULLY DOCUMENTED
//

/* 
The red line for all of the assignments follow a parabola
The first part of the pset() function calculates the a and b values, and the second part handles the minimum work time and return cutoffs
funct(n) returns the output of an^2 + bn (with no c variable because it is translated to go through the origin)
set_mod_days() helps integrate not working days into the schedule 
*/
// new file, easier for development
// no side effect
// no rewrite
function pset(context, x2 = false, y2 = false) {
    const { x, red_line_start_x, y, red_line_start_y, len_nwd, mods, set_skew_ratio, wCon, height, hCon, nwd, assign_day_of_week, skew_ratio_lim, remainder_mode, y_fremainder, funct_round, min_work_time, min_work_time_funct_round, ignore_ends_mwt } = context;
    let { skew_ratio } = context;
    let a,
        b,
        cutoff_transition_value,
        cutoff_to_use_round,
        return_y_cutoff,
        return_0_cutoff;
    function c_funct(n, translate) {
        const context = {
            red_line_start_x: red_line_start_x,
            len_nwd: len_nwd,
            mods: mods,
            return_y_cutoff: return_y_cutoff,
            y: y,
            return_0_cutoff: return_0_cutoff,
            red_line_start_y: red_line_start_y,
            funct_round: funct_round,
            min_work_time: min_work_time,
            a: a,
            b: b,
            min_work_time_funct_round: min_work_time_funct_round,
            cutoff_to_use_round: cutoff_to_use_round,
            cutoff_transition_value: cutoff_transition_value,
            remainder_mode: remainder_mode,
            y_fremainder: y_fremainder,
        }
        return funct(n, context, translate);
    }
    /*
    The purpose of this function is to calculate these seven variables:
    a
    b
    skew_ratio
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
    If set skew ratio isn't enabled, the third point is now (1,x1/y1 * skew_ratio)
    Here, a straight line is connected from (0,0) and (x1,y1) and then the output of f(1) of that straight line is multiplied by the skew ratio to get the y-coordinate of the first point
    */

    // Define (x1, y1) and translate both variables to (0,0)
    let x1 = x - red_line_start_x,
        y1 = y - red_line_start_y;
    if (len_nwd) {
        x1 -= Math.floor(x1 / 7) * len_nwd + mods[x1 % 7]; // Handles not working day, explained later
    }
    // If set skew ratio is enabled, make the third point (x2,y2), which was passed as a parameter
    // x2 !== false is necessary because the user can resize the browser for example and call this function while set skew ratio is true but without passing any coordinates
    if (set_skew_ratio && x2 !== false) {
        // (x2,y2) are the raw coordinates of the graoh
        // This converts the raw coordinates to graph coordinates, which match the steps on the x and y axes
        // -53.7 and -44.5 were used instead of -50 because I experimented those to be the optimal positions
        x2 = (x2 - 53.7) / wCon - red_line_start_x;
        y2 = (height - y2 - 44.5) / hCon - red_line_start_y;
        // Handles not working days, explained later
        if (len_nwd) {
            const floorx2 = Math.floor(x2);
            if (nwd.includes((assign_day_of_week + floorx2 + red_line_start_x) % 7)) {
                x2 = floorx2;
            }
            x2 -= Math.floor(x2 / 7) * len_nwd + mods[floorx2 % 7];
        }
        // If the mouse is outside the graph to the left, make a line a the slope of y1
        // Use !(x2 > 0) instead of (x2 <= 0) because x2 can be NaN from being outside of the graph, caused by negative indexing by floorx2. This ensures that NaN passes this statement
        if (!(x2 > 0)) {
            return {
                a: 0,
                b: y1,
                skew_ratio: skew_ratio_lim,
                cutoff_transition_value: 0,
                // Don't include cutoff_to_use_round because it will never be used if a = 0 and b = y1 I think
                return_y_cutoff: x1 ? 0 : -1,
                return_0_cutoff: 1
            }
        } else if (x2 >= x1) {
            // If the mouse is outside the graph to the right, connect the points (0,0), (x1-1,0), (x1,y1)
            // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
            a = y1 / x1;
            b = a * (1 - x1);

            skew_ratio = 2 - skew_ratio_lim;
        } else {
            // Adjusts for remainder mode
            if (remainder_mode) {
                y2 -= y_fremainder;
            }
            // If the parabola is being set by the graph, connect (0,0), (x1,y1), (x2,y2)
            // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
            a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
            b = (y1 - x1 * x1 * a) / x1;

            // Redefine skew ratio
            skew_ratio = (a + b) * x1 / y1;
            // Cap skew ratio
            if (skew_ratio > skew_ratio_lim) {
                skew_ratio = skew_ratio_lim;
            } else if (skew_ratio < 2 - skew_ratio_lim) {
                skew_ratio = 2 - skew_ratio_lim;
            } else if (Math.abs(skew_ratio) % 1 < 0.05) {
                // Snap skew ratio to whole numbers
                skew_ratio = Math.round(skew_ratio);
                // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                a = y1 * (1 - skew_ratio) / ((x1 - 1) * x1);
                b = (y1 - x1 * x1 * a) / x1;
            }
        }
    } else {
        // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
        a = y1 * (1 - skew_ratio) / ((x1 - 1) * x1);
        b = (y1 - x1 * x1 * a) / x1;
    }
    if (!Number.isFinite(a)) {
        // If there was a zero division somewhere, where x2 === 1 or something else happened, make a line with the slope of y1
        return {
            a: 0,
            b: y1,
            skew_ratio: skew_ratio,
            cutoff_transition_value: 0,
            // Don't include cutoff_to_use_round because it will never be used if a = 0 and b = y1 I think
            return_y_cutoff: x1 ? 0 : -1,
            return_0_cutoff: return_0_cutoff,
        }
    }
    if (a <= 0 || b > 0) {
        var funct_zero = 0;
    } else {
        var funct_zero = -b / a;
    }
    if (a >= 0) {
        var funct_y = x1;
    } else {
        var funct_y = ((Math.sqrt(b * b + 4 * a * y1) - b) / a / 2).toFixed(10);
    }
    if (funct_round < min_work_time) {
        cutoff_transition_value = 0;
        if (a) {
            cutoff_to_use_round = ((min_work_time_funct_round - b) / a / 2).toFixed(10) - 1e-10;
            if (funct_zero < cutoff_to_use_round && cutoff_to_use_round < funct_y) {
                let n = Math.floor(cutoff_to_use_round),
                    prev_output;
                for (n of [n, ++n]) {
                    var output = c_funct(n, false);
                    if (output > y) {
                        output = y;
                    } else if (output < 0) {
                        output = 0;
                    }
                    prev_output = prev_output || output;
                }
                if (output - prev_output) {
                    console.log(output,prev_output);
                    cutoff_transition_value = min_work_time_funct_round - output + prev_output;
                }
            }
        }
    }
    if (ignore_ends_mwt) {
        var y_value_to_cutoff = y1;
    } else if (funct_round < min_work_time && (!a && b < min_work_time_funct_round || a && (a > 0) === (funct_y < cutoff_to_use_round))) {
        var y_value_to_cutoff = y1 - min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = y1 - min_work_time_funct_round + funct_round / 2;
    }
    if (y_value_to_cutoff > 0 && y > red_line_start_y && (a || b)) {
        return_y_cutoff = (a ? (Math.sqrt(b * b + 4 * a * y_value_to_cutoff)-b)/a/2 : y_value_to_cutoff/b).toFixed(10) - 1e-10;
    } else {
        return_y_cutoff = 0;
    }
    if (return_y_cutoff < 2500) {
        if (return_y_cutoff < 1) {
            var output = 0;
        } else {
            for (let n = Math.floor(return_y_cutoff); n > 0; n--) {
                var output = c_funct(n, false);
                if (output <= y - min_work_time_funct_round) {
                    break;
                }
                return_y_cutoff--;
            }
        }
        if (ignore_ends_mwt) {
            const lower = [return_y_cutoff, y - output];

            let did_loop = false;
            for (let n = Math.ceil(return_y_cutoff); n < x1; n++) {
                const pre_output = c_funct(n, false);
                if (pre_output >= y) {
                    break;
                }
                did_loop = true;
                output = pre_output;
                return_y_cutoff++;
            }
            if (did_loop) {
                const upper = [return_y_cutoff, y - output];
                return_y_cutoff = [upper, lower][+(min_work_time_funct_round * 2 - lower[1] > upper[1])][0];
            }
        }
    }
    if (ignore_ends_mwt) {
        var y_value_to_cutoff = 0;
    } else if (funct_round < min_work_time && (!a && b < min_work_time_funct_round || a && (a > 0) === (funct_zero < cutoff_to_use_round))) {
        var y_value_to_cutoff = min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = min_work_time_funct_round - funct_round / 2;
    }
    if (y_value_to_cutoff < y1 && y > red_line_start_y && (a || b)) {
        return_0_cutoff = (a ? (Math.sqrt(b * b + 4 * a * y_value_to_cutoff) - b) / a / 2 : y_value_to_cutoff / b).toFixed(10) - 1e-10;
        // -1e-10 makes this negative
        if (return_0_cutoff < 0) {
            return_0_cutoff++;
        }
    } else {
        return_0_cutoff = 1;
    }
    if (x1 - return_0_cutoff < 2500) {
        if (x1 - return_0_cutoff < 1) {
            var output = 0;
        } else {
            for (let n = Math.ceil(return_0_cutoff); n < x1; n++) {
                var output = c_funct(n, false);
                if (output >= min_work_time_funct_round + red_line_start_y) {
                    break;
                }
                return_0_cutoff++;
            }
        }
        if (ignore_ends_mwt) {
            const upper = [return_0_cutoff, output];

            let did_loop = false;
            for (let n = Math.floor(return_0_cutoff); n > 0; n--) {
                const pre_output = c_funct(n, false);
                if (pre_output <= red_line_start_y) {
                    break;
                }
                did_loop = true;
                var output = pre_output;
                return_0_cutoff--;
            }
            if (did_loop) {
                const lower = [return_0_cutoff, output];
                return_0_cutoff = [lower, upper][+(min_work_time_funct_round * 2 - upper[1] > lower[1])][0];
            }
        }
    }
    return {
        a: a,
        b: b,
        skew_ratio: skew_ratio,
        cutoff_transition_value: cutoff_transition_value,
        cutoff_to_use_round: cutoff_to_use_round,
        return_y_cutoff: return_y_cutoff,
        return_0_cutoff: return_0_cutoff
    }
}
function funct(n, context, translate=true) {
    const { red_line_start_x, len_nwd, mods, return_y_cutoff, y, return_0_cutoff, red_line_start_y, funct_round, min_work_time, a, b, min_work_time_funct_round, cutoff_to_use_round, cutoff_transition_value, remainder_mode, y_fremainder } = context;
    if (translate) {
        // Translate x coordinate 
        n -= red_line_start_x;
        if (len_nwd) {
            n -= Math.floor(n / 7) * len_nwd + mods[n % 7];
        }
        if (n > return_y_cutoff) {
            return y;
        } else if (n < return_0_cutoff) {
            return red_line_start_y;
        }
    }
    if (funct_round < min_work_time && (!a && b < min_work_time_funct_round || a && (a > 0) === (n < cutoff_to_use_round))) {
        // Get translated y coordinate
        var output = min_work_time_funct_round * Math.round(n * (a * n + b) / min_work_time_funct_round);
        if (a < 0) {
            output += cutoff_transition_value;
        } else {
            output -= cutoff_transition_value;
        }
    } else {
        var output = funct_round * Math.round(n * (a * n + b) / funct_round);
    }
    if (remainder_mode && output) {
        output += y_fremainder;
    }
    // Return untranslated y coordinate
    // No point in untranslating x coordinate
    return output + red_line_start_y;
}
function calc_mod_days(context) {
    const { nwd, assign_day_of_week, red_line_start_x } = context;
    let mods = [0],
        mod_counter = 0;
    for (let mod_day = 0; mod_day < 6; mod_day++) {
        if (nwd.includes((assign_day_of_week + red_line_start_x + mod_day) % 7)) {
            mod_counter++;
        }
        mods.push(mod_counter);
    }
    return mods;
}