import User from './User'
import Post from './Post'
import Tag from './Tag'
import Classify from './Classify'
import Category from './Category'
import Group from './Group'
import Sdg from './Sdg'
import Latest from './Latest'
import Event from './Event'
import Audio from './Audio'
import Author from './Author'
import Video from './Video'
import Poll from './Poll'
import PollOption from './PollOption'
import PollResult from './PollResult'
import EditorChoice from './EditorChoice'
import PromoteStory from './PromoteStory'
import PromoteEvent from './PromoteEvent'
import Influence from './Influence'
import Image from './Image'
import Banner from './Banner'
import Award from './Award'
import Download from './Download'
import InfoGraph from './InfoGraph'
import Longform from './Longform'
import Donation from './Donation'
import NewebpayPayment from './NewebpayPayment'

export const listDefinition = {
  Post,
  Classify,
  Category,
  Group: Group,
  EditorChoice,
  LatestNew: Latest,
  Banner,
  Event,
  PromoteStory,
  PromoteEvent,
  Influence,
  AudioFile: Audio, // workaround：K6不支持Audio作為list name，因為複數問題（但不知為何Video就可以）
  Author,
  Video,
  Photo: Image,
  InfoGraph,
  Poll,
  PollOption,
  PollResult,
  Tag,
  SDG: Sdg,
  Award,
  Download,
  Longform,
  User,
  //Project,
  Donation,
  NewebpayPayment,
}
