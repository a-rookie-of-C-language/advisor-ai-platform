/// Immutable retry settings captured for one provider route.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct RetryPolicy {
    pub(crate) max_attempts: u8,
    pub(crate) base_delay_ms: u64,
    pub(crate) max_delay_ms: u64,
}

impl RetryPolicy {
    pub(crate) const fn new(max_attempts: u8, base_delay_ms: u64, max_delay_ms: u64) -> Self {
        Self {
            max_attempts,
            base_delay_ms,
            max_delay_ms,
        }
    }

    pub(crate) fn allows_retry(self, attempt: u8, retryable: bool, stream_started: bool) -> bool {
        retryable && !stream_started && attempt < self.max_attempts
    }

    pub(crate) fn delay_ms(self, attempt: u8) -> u64 {
        let exponent = std::cmp::min(attempt.saturating_sub(1), 10);
        let multiplier = 1u64 << exponent;
        std::cmp::min(
            self.base_delay_ms.saturating_mul(multiplier),
            self.max_delay_ms,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::RetryPolicy;

    #[test]
    fn retry_stops_after_visible_output_or_attempt_budget() {
        let policy = RetryPolicy::new(3, 100, 500);
        assert!(policy.allows_retry(1, true, false));
        assert!(!policy.allows_retry(1, true, true));
        assert!(!policy.allows_retry(3, true, false));
    }

    #[test]
    fn exponential_delay_is_capped() {
        let policy = RetryPolicy::new(4, 100, 250);
        assert_eq!(policy.delay_ms(1), 100);
        assert_eq!(policy.delay_ms(2), 200);
        assert_eq!(policy.delay_ms(3), 250);
    }
}
