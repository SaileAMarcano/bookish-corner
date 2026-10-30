import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PostCard from './PostCard';
import Notice from './Notice';
import Icon from './Icon';
import { apiFetch } from './api';

function PostPage({ currentUser, books }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [post, setPost] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let ignore = false;

        apiFetch(`/api/posts/${id}`)
            .then((data) => {
                if (!ignore) setPost(data);
            })
            .catch((err) => {
                if (!ignore) setError(err.message);
            });

        return () => {
            ignore = true;
        };
    }, [id]);

    const handleChange = (postId, changes) => {
        setPost((current) => ({ ...current, ...changes }));
    };

    return (
        <main className="page post-page">
            <button type="button" className="ghost-button post-page-back" onClick={() => navigate(-1)}>
                <Icon name="arrowLeft" size={14} />
                {t('postPage.back')}
            </button>

            {error && <Notice message={error} />}
            {!post && !error && <p className="tags-empty">{t('admin.loading')}</p>}

            {post && (
                <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUser.id}
                    onChange={handleChange}
                    onDeleted={() => navigate('/')}
                    books={books}
                    openComments
                />
            )}
        </main>
    );
}

export default PostPage;