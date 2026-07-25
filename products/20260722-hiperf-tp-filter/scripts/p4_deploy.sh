# Deploy freshly built hiperf to a writable temp path (avoids /system/bin "text file busy").
HOST="/home/lyk/ohos/openharmony/out/rk3568/developtools/hiperf/hiperf"
DEST="/data/local/tmp/hiperf"
dev_send "$HOST" "$DEST"
dev_shell "chmod 755 $DEST"
