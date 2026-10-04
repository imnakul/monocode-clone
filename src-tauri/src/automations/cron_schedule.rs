const RANGES: [(u64, u64); 5] = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 7)];
const LABELS: [&str; 5] = ["Minute", "Hour", "Day of month", "Month", "Weekday"];
const MONTH_DAYS: [u64; 12] = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/// Same bounded numeric grammar as the renderer; no shell or process calls.
pub(super) fn validate_cron(expression: &str) -> Result<(), String> {
    if expression.len() > 256 {
        return Err("Custom schedule is too long (maximum 256 characters).".into());
    }
    let parts: Vec<_> = expression.split_whitespace().collect();
    if parts.len() != 5 {
        return Err("Use five fields: minute, hour, day of month, month, weekday.".into());
    }
    let mut fields = Vec::new();
    for (index, part) in parts.iter().enumerate() {
        fields.push(parse_field(part, index)?);
    }
    if (parts[2].starts_with('*') || parts[4].starts_with('*'))
        && !fields[3].iter().any(|month| {
            fields[2]
                .iter()
                .any(|day| *day <= MONTH_DAYS[(*month - 1) as usize])
        })
    {
        return Err("This schedule has no calendar date. Check the day of month and month.".into());
    }
    Ok(())
}

fn number(value: &str) -> Option<u64> {
    if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
        return None;
    }
    // Match JavaScript's safe-integer limit, including large / steps.
    value
        .parse::<u64>()
        .ok()
        .filter(|value| *value <= 9_007_199_254_740_991)
}

fn parse_field(part: &str, index: usize) -> Result<Vec<u64>, String> {
    let (min, max) = RANGES[index];
    let error = || {
        format!(
            "{}: use values {min}–{max}, *, lists, ascending ranges and positive / steps.",
            LABELS[index]
        )
    };
    let mut values = Vec::new();
    for item in part.split(',') {
        let mut pieces = item.split('/');
        let base = pieces.next().ok_or_else(error)?;
        let step_raw = pieces.next();
        if pieces.next().is_some() {
            return Err(error());
        }
        let step = match step_raw {
            Some(value) => number(value).filter(|value| *value > 0).ok_or_else(error)?,
            None => 1,
        };
        let (from, to) = if base == "*" {
            (min, max)
        } else if let Some((from, to)) = base.split_once('-') {
            (
                number(from).ok_or_else(error)?,
                number(to).ok_or_else(error)?,
            )
        } else {
            let from = number(base).ok_or_else(error)?;
            (from, if step_raw.is_some() { max } else { from })
        };
        if from < min || from > max || to < from || to > max {
            return Err(error());
        }
        let mut value = from;
        while value <= to {
            values.push(if index == 4 && value == 7 { 0 } else { value });
            value += step;
        }
    }
    values.sort_unstable();
    values.dedup();
    Ok(values)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_numeric_cron_lists_ranges_steps_sunday_and_leap_day() {
        for expression in [
            "* * * * *",
            "0 21 * * *",
            "*/15 9-17 * * 1-5",
            "5/15 0,12 2 * 0,7",
            "0 0 29 2 *",
            "0 0 31 2 1",
        ] {
            assert!(validate_cron(expression).is_ok(), "{expression}");
        }
        assert_eq!(parse_field("0,7", 4).unwrap(), vec![0]);
    }

    #[test]
    fn rejects_invalid_or_impossible_schedules() {
        for expression in [
            "* * 2 *",
            "0 * * * * *",
            "60 * * * *",
            "0 24 * * *",
            "0 0 0 * *",
            "0 0 * 13 *",
            "0 0 * * 8",
            "*/0 * * * *",
            "10-5 * * * *",
            "0,,1 * * * *",
            "0 0 * * MON",
            "@daily",
            "0 0 30 2 *",
            "0 0 31 4,6 *",
            "*/1/2 * * * *",
        ] {
            assert!(validate_cron(expression).is_err(), "{expression}");
        }
        assert!(validate_cron(&" ".repeat(257)).is_err());
    }
}
