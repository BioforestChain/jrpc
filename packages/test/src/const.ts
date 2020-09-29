export const enum IOB_Type {
  /**克隆 */
  Clone,
  /**符号对象
   * 这个是比较特殊的存在，理论上属于Clone，但是是属于特殊的引用克隆
   */
  RemoteSymbol,
  /**本地符号引用 */
  LocalSymbol,
  /**远端引用（必须是之前已经新建过的） */
  Ref,
  //   /**新建远端引用 */
  //   NewRef,
  /**本地引用 */
  Locale,
  //   /**默认引用 */
  //   Default,
}