
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.cairo
    pkgs.pango
    pkgs.libpng
    pkgs.libjpeg
    pkgs.giflib
    pkgs.libuuid
    pkgs.pixman
    pkgs.fontconfig
    pkgs.pkg-config
  ];
}
