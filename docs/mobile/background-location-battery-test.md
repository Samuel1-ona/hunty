# Background location battery test

Hunty uses native geofencing instead of continuous GPS polling. The operating system wakes the app only for region transitions. The app records each wakeup in `hunty-background-location-metrics`, including start time, stop time, total background events, entry events, and the most recent event time.

## Test procedure

1. Install a release build on a physical iOS or Android device.
2. Charge the device to at least 80 percent and disable battery saver.
3. Enable background proximity alerts for a hunt with 5 valid clue regions.
4. Leave Hunty in the background for 8 hours without entering a region.
5. Record the operating system battery usage attributed to Hunty and the stored metrics.
6. Repeat with background proximity disabled under similar network and movement conditions.
7. Repeat both runs while entering two clue regions.

## Report

| Platform and version    | Device | Regions | Duration | Background events | Entries | Enabled drain | Control drain | Difference |
| ----------------------- | ------ | ------: | -------: | ----------------: | ------: | ------------: | ------------: | ---------: |
| Fill during device test |        |       5 |      8 h |                   |         |               |               |            |

The acceptance target is no more than 2 percentage points of additional battery drain over 8 hours while stationary, and no repeated notification for the same clue during one monitoring session. Physical device results must be attached to the pull request because simulators do not produce meaningful battery measurements.
