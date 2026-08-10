import { pipe, Option as O, Array as A } from "effect"
import { BuilderState } from "../builder-types.js"
import { Token } from "../tokenizer.js"
import { getDirectiveHandlers, getModeHandlers } from "../../plugins/registry.js"

import { handleBlankLine, handleHorizontalRule, handleH1, handleH2, handleH3 } from "./structural.js"
import { handleLeftDirective, handleRightDirective, handleTopDirective, handleBottomDirective, handleGridDirective } from "./layout-directives.js"
import { handleIconDirective, handleIdDirective, handleTakeawayMarker, handleSourceMarker, handleCodeFenceOpen, handleCodeFenceLine, handleCodeFenceClose } from "./inline.js"
import { handleBodyText } from "./body-text.js"

// トークンハンドラーの型
export type TokenHandler = (state: BuilderState, token: Token) => O.Option<BuilderState>

// Plugin mode handler dispatcher — intercepts tokens when in a plugin mode
const pluginModeDispatcher: TokenHandler = (state, token) => {
  const handlers = getModeHandlers(state.mode)
  if (!handlers) return O.none()
  return pipe(
    handlers.map(h => h(state, token)),
    A.findFirst(O.isSome),
    O.flatten
  )
}

// H4: absorb #### tokens (only meaningful in plugin modes like customer-journey)
const handleH4Core: TokenHandler = (state, token) =>
  token.type === "H4" ? O.some(state) : O.none()

// Build handler list with plugin handlers injected
function buildHandlers(): ReadonlyArray<TokenHandler> {
  return [
    handleHorizontalRule,
    handleH1,
    handleH2,
    // ID はスライド単位の属性なので、プラグインのモードハンドラより先に処理する
    // （プラグインブロックの中でも <!--id:--> を書けるようにするため）
    handleIdDirective,
    pluginModeDispatcher,
    handleBlankLine,
    handleH3,
    handleH4Core,
    handleLeftDirective,
    handleRightDirective,
    handleTopDirective,
    handleBottomDirective,
    handleGridDirective,
    handleIconDirective,
    handleTakeawayMarker,
    handleSourceMarker,
    ...getDirectiveHandlers(),
    handleCodeFenceOpen,
    handleCodeFenceLine,
    handleCodeFenceClose,
    handleBodyText,
  ]
}

// トークン処理のメイン関数
export const processToken = (state: BuilderState, token: Token): BuilderState => {
  const handlers = buildHandlers()
  return pipe(
    handlers.map(handler => handler(state, token)),
    A.findFirst(O.isSome),
    O.flatten,
    O.getOrElse(() => state)
  )
}
