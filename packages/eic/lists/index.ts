import Post from './Post'
import Tag from './Tag'
import Category from './Category'
import Audio from './Audio'
import Video from './Video'
import Data from './Data'
import EditorChoice from './EditorChoice'
import User from './User'
import Author from './Author'
import Image from './Image'
import Award from './Award'
import PageVariable from './PageVariable'

export const listDefinition = {
  EditorChoice,
  Photo: Image,
  Author,
  PageVariable,
  Video,
  AudioFile: Audio,
  Tag,
  Category,
  User,
  Post,
}
