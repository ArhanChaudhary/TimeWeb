/* 
This file includes the code for:

Calculating the curve of the parabola
Implementing break days, mininum work time, and amount of units to complete at a time
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
set_mod_days() helps integrate break days into the schedule 
*/
// new file, easier for development
// no side effect
// no rewrite
function pset(ctx, x2 = false, y2 = false) {
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
    let x1 = ctx.x - ctx.red_line_start_x,
        y1 = ctx.y - ctx.red_line_start_y;
    if (ctx.break_days.length) {
        x1 -= Math.floor(x1 / 7) * ctx.break_days.length + ctx.mods[x1 % 7]; // Handles break days, explained later
    }
    // If set skew ratio is enabled, make the third point (x2,y2), which was passed as a parameter
    // x2 !== false is necessary because the user can resize the browser for example and call this function while set skew ratio is true but without passing any coordinates
    if (ctx.set_skew_ratio && x2 !== false) {
        // (x2,y2) are the raw coordinates of the graoh
        // This converts the raw coordinates to graph coordinates, which match the steps on the x and y axes
        // -53.7 and -44.5 were used instead of -50 because I experimented those to be the optimal positions
        x2 = (x2 - 53.7) / ctx.wCon - ctx.red_line_start_x;
        y2 = (ctx.height - y2 - 44.5) / ctx.hCon - ctx.red_line_start_y;
        // Handles break days, explained later
        if (ctx.break_days.length) {
            const floorx2 = Math.floor(x2);
            if (ctx.break_days.includes((ctx.assign_day_of_week + floorx2 + ctx.red_line_start_x) % 7)) {
                x2 = floorx2;
            }
            x2 -= Math.floor(x2 / 7) * ctx.break_days.length + ctx.mods[floorx2 % 7];
        }
        // If the mouse is outside the graph to the left, make a line a the slope of y1
        // Use !(x2 > 0) instead of (x2 <= 0) because x2 can be NaN from being outside of the graph, caused by negative indexing by floorx2. This ensures that NaN passes this statement
        if (!(x2 > 0)) {
            return {
                a: 0,
                b: y1,
                skew_ratio: ctx.skew_ratio_lim,
                cutoff_transition_value: 0,
                // Don't include cutoff_to_use_round because it will never be used if a = 0 and b = y1
                return_y_cutoff: x1 ? 1 : 0,
                return_0_cutoff: 0,
            }
        } else if (x2 >= x1) {
            // If the mouse is outside the graph to the right, connect the points (0,0), (x1-1,0), (x1,y1)
            // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
            ctx.a = y1 / x1;
            ctx.b = ctx.a * (1 - x1);

            ctx.skew_ratio = 2 - ctx.skew_ratio_lim;
        } else {
            // If the parabola is being set by the graph, connect (0,0), (x1,y1), (x2,y2)
            // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
            ctx.a = (x2 * y1 - x1 * y2) / ((x1 - x2) * x1 * x2);
            ctx.b = (y1 - x1 * x1 * ctx.a) / x1;

            // Redefine skew ratio
            ctx.skew_ratio = (ctx.a + ctx.b) * x1 / y1;
            // Cap skew ratio
            if (ctx.skew_ratio > ctx.skew_ratio_lim) {
                ctx.skew_ratio = ctx.skew_ratio_lim;
            } else if (ctx.skew_ratio < 2 - ctx.skew_ratio_lim) {
                ctx.skew_ratio = 2 - ctx.skew_ratio_lim;
            } else if (Math.abs(ctx.skew_ratio) % 1 < 0.05) {
                // Snap skew ratio to whole numbers
                ctx.skew_ratio = Math.round(ctx.skew_ratio);
                // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
                ctx.a = y1 * (1 - ctx.skew_ratio) / ((x1 - 1) * x1);
                ctx.b = (y1 - x1 * x1 * ctx.a) / x1;
            }
        }
    } else {
        // cite http://stackoverflow.com/questions/717762/how-to-calculate-the-vertex-of-a-parabola-given-three-points
        ctx.a = y1 * (1 - ctx.skew_ratio) / ((x1 - 1) * x1);
        ctx.b = (y1 - x1 * x1 * ctx.a) / x1;
    }
    if (!Number.isFinite(ctx.a)) {
        // If there was a zero division somewhere, where x2 === 1 or something else happened, make a line with the slope of y1
        return {
            a: 0,
            b: y1,
            skew_ratio: ctx.skew_ratio,
            cutoff_transition_value: 0,
            // Don't include cutoff_to_use_round because it will never be used if a = 0 and b = y1
            return_y_cutoff: x1 ? 1 : 0,
            return_0_cutoff: 0,
        }
    }
    if (ctx.a <= 0 || ctx.b > 0) {
        var funct_zero = 0;
    } else {
        var funct_zero = utils.precisionRound(-ctx.b / ctx.a, 10)
    }
    if (ctx.a >= 0) {
        var funct_y = x1;
    } else {
        var funct_y = utils.precisionRound((Math.sqrt(ctx.b * ctx.b + 4 * ctx.a * y1) - ctx.b) / ctx.a / 2, 10);
    }
    if (ctx.funct_round < ctx.min_work_time) {
        ctx.cutoff_transition_value = 0;
        if (ctx.a) {
            ctx.cutoff_to_use_round = utils.precisionRound((ctx.min_work_time_funct_round - ctx.b) / ctx.a / 2, 10) - 1e-10;
            if (funct_zero < ctx.cutoff_to_use_round && ctx.cutoff_to_use_round < funct_y) {
                // Same thing as:
                // const prev_output = clamp(0, c_funct(Math.floor(ctx.cutoff_to_use_round)), ctx.y)
                // const output = clamp(0, c_funct(Math.ceil(ctx.cutoff_to_use_round)), ctx.y)
                const prev_output = Math.min(Math.max(
                    funct(Math.floor(ctx.cutoff_to_use_round), ctx, false)
                , 0), ctx.y),
                    output = Math.min(Math.max(
                        funct(Math.ceil(ctx.cutoff_to_use_round), ctx, false)
                    , 0), ctx.y);
                if (output - prev_output) {
                    ctx.cutoff_transition_value = ctx.min_work_time_funct_round - output + prev_output;
                }
            }
        }
    }
    if (ctx.ignore_ends_mwt) {
        var y_value_to_cutoff = y1;
    } else if (ctx.funct_round < ctx.min_work_time && (!ctx.a && ctx.b < ctx.min_work_time_funct_round || ctx.a && (ctx.a > 0) === (funct_y < ctx.cutoff_to_use_round))) {
        var y_value_to_cutoff = y1 - ctx.min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = y1 - ctx.min_work_time_funct_round + ctx.funct_round / 2;
    }
    if (y_value_to_cutoff > 0 && ctx.y > ctx.red_line_start_y && (ctx.a || ctx.b)) {
        if (ctx.a) {
            ctx.return_y_cutoff = (Math.sqrt(ctx.b * ctx.b + 4 * ctx.a * y_value_to_cutoff) - ctx.b) / ctx.a / 2;
        } else {
            ctx.return_y_cutoff = y_value_to_cutoff/ctx.b;
        }
        ctx.return_y_cutoff = utils.precisionRound(ctx.return_y_cutoff, 10);
    } else {
        ctx.return_y_cutoff = 0;
    }
    if (ctx.return_y_cutoff < 2500) {
        if (ctx.return_y_cutoff < 1) {
            var output = 0;
        } else {
            // do ceil -1 instead of floor because ceil -1 is inclusive of ints; without this integer return cutoffs are glitchy
            for (let n = Math.ceil(ctx.return_y_cutoff - 1); n > 0; n--) {
                var output = funct(n, ctx, false);
                if (output <= ctx.y - ctx.min_work_time_funct_round) {
                    break;
                }
                ctx.return_y_cutoff--;
            }
            if (ctx.return_y_cutoff <= 0) {
                ctx.return_y_cutoff++;
            }
        }
        if (ctx.ignore_ends_mwt) {
            const lower = [ctx.return_y_cutoff, ctx.y - output];

            let did_loop = false;
            for (let n = Math.floor(ctx.return_y_cutoff + 1); n < x1; n++) {
                const pre_output = funct(n, ctx, false);
                if (pre_output >= ctx.y) {
                    break;
                }
                did_loop = true;
                output = pre_output;
                ctx.return_y_cutoff++;
            }
            if (did_loop) {
                const upper = [ctx.return_y_cutoff, ctx.y - output];
                ctx.return_y_cutoff = [upper, lower][+(ctx.min_work_time_funct_round * 2 - lower[1] > upper[1])][0];
            }
        }
    }
    if (ctx.ignore_ends_mwt) {
        var y_value_to_cutoff = 0;
    } else if (ctx.funct_round < ctx.min_work_time && (!ctx.a && ctx.b < ctx.min_work_time_funct_round || ctx.a && (ctx.a > 0) === (funct_zero < ctx.cutoff_to_use_round))) {
        var y_value_to_cutoff = ctx.min_work_time_funct_round / 2;
    } else {
        var y_value_to_cutoff = ctx.min_work_time_funct_round - ctx.funct_round / 2;
    }

    if (y_value_to_cutoff < y1 && ctx.y > ctx.red_line_start_y && (ctx.a || ctx.b)) {
        if (ctx.a) {
            ctx.return_0_cutoff = (Math.sqrt(ctx.b * ctx.b + 4 * ctx.a * y_value_to_cutoff) - ctx.b) / ctx.a / 2;
        } else {
            ctx.return_0_cutoff = y_value_to_cutoff / ctx.b;
        }
        ctx.return_0_cutoff = utils.precisionRound(ctx.return_0_cutoff, 10);
    } else {
        ctx.return_0_cutoff = 1;
    }
    if (x1 - ctx.return_0_cutoff < 2500) {
        if (x1 - ctx.return_0_cutoff < 1) {
            var output = 0;
        } else {
            for (let n = Math.ceil(ctx.return_0_cutoff); n < x1; n++) {
                var output = funct(n, ctx, false);
                if (output >= ctx.min_work_time_funct_round + ctx.red_line_start_y) {
                    break;
                }
                ctx.return_0_cutoff++;
            }
            if (ctx.return_0_cutoff >= x1) {
                ctx.return_0_cutoff--;
            }
        }
        if (ctx.ignore_ends_mwt) {
            const upper = [ctx.return_0_cutoff, output];

            let did_loop = false;
            for (let n = Math.floor(ctx.return_0_cutoff); n > 0; n--) {
                const pre_output = funct(n, ctx, false);
                if (pre_output <= ctx.red_line_start_y) {
                    break;
                }
                did_loop = true;
                var output = pre_output;
                ctx.return_0_cutoff--;
            }
            if (did_loop) {
                const lower = [ctx.return_0_cutoff, output];
                ctx.return_0_cutoff = [lower, upper][+(ctx.min_work_time_funct_round * 2 - upper[1] > lower[1])][0];
            }
        }
    }
    return ctx;
}

function funct(x, ctx, translateX) {
    if (translateX) {
        // Translate x coordinate 
        x -= ctx.red_line_start_x;
        if (ctx.break_days.length) {
            x -= Math.floor(x / 7) * ctx.break_days.length + ctx.mods[x % 7];
        }
        if (x >= ctx.return_y_cutoff) return ctx.y;
        if (x <= ctx.return_0_cutoff) return ctx.red_line_start_y;
    }
    if (ctx.funct_round < ctx.min_work_time && (!ctx.a && ctx.b < ctx.min_work_time_funct_round || ctx.a && (ctx.a > 0) === (x < ctx.cutoff_to_use_round))) {
        // Get translated y coordinate
        var output = ctx.min_work_time_funct_round * Math.round(x * (ctx.a * x + ctx.b) / ctx.min_work_time_funct_round);
        if (ctx.a < 0) {
            output += ctx.cutoff_transition_value;
        } else {
            output -= ctx.cutoff_transition_value;
        }
    } else {
        var output = ctx.funct_round * Math.round(x * (ctx.a * x + ctx.b) / ctx.funct_round);
    }
    // Return untranslated y coordinate
    // No point in untranslating x coordinate
    return output + ctx.red_line_start_y;
}

function calc_mod_days(ctx) {
    let mods = [0],
        mod_counter = 0;
    for (let mod_day = 0; mod_day < 6; mod_day++) {
        if (ctx.break_days.includes((ctx.assign_day_of_week + ctx.red_line_start_x + mod_day) % 7)) {
            mod_counter++;
        }
        mods.push(mod_counter);
    }
    return mods;
}